"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'FRONTEND_URL'
];
console.log('\nEnvironment Variables Check:');
console.log('============================\n');
let missingVars = false;
requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
        console.log(`❌ ${varName} is missing or empty`);
        missingVars = true;
    }
    else {
        // For sensitive values, just show that they exist
        if (varName === 'SUPABASE_KEY') {
            console.log(`✅ ${varName} is set (value hidden)`);
        }
        else {
            console.log(`✅ ${varName} = ${value}`);
        }
    }
});
console.log('\nSummary:');
console.log('========\n');
if (missingVars) {
    console.log('❌ Some required environment variables are missing. Please check your .env file.');
}
else {
    console.log('✅ All required environment variables are properly set!');
}
