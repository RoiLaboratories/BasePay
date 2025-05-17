"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'SUPABASE_URL',
    'SUPABASE_KEY',
    'FRONTEND_URL'
];
console.log('\nEnvironment Variables Check:');
console.log('============================\n');
var missingVars = false;
requiredEnvVars.forEach(function (varName) {
    var value = process.env[varName];
    if (!value) {
        console.log("\u274C ".concat(varName, " is missing or empty"));
        missingVars = true;
    }
    else {
        // For sensitive values, just show that they exist
        if (varName === 'SUPABASE_KEY') {
            console.log("\u2705 ".concat(varName, " is set (value hidden)"));
        }
        else {
            console.log("\u2705 ".concat(varName, " = ").concat(value));
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
