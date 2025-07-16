const fs = require('fs');
const path = require('path');

console.log('🔍 Checking deployment readiness...\n');

// Check if required files exist
const requiredFiles = [
    'index.js',
    'package.json',
    '.env',
    'Procfile'
];

const missingFiles = [];
const existingFiles = [];

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        existingFiles.push(file);
        console.log(`✅ ${file} - Found`);
    } else {
        missingFiles.push(file);
        console.log(`❌ ${file} - Missing`);
    }
});

console.log('\n📦 Checking package.json...');

try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    if (packageJson.scripts && packageJson.scripts.start) {
        console.log('✅ Start script found:', packageJson.scripts.start);
    } else {
        console.log('❌ No start script in package.json');
    }
    
    const requiredDeps = ['telegraf', 'mongodb', 'redis', 'joi', 'moment', 'bad-words', 'dotenv'];
    const missingDeps = [];
    
    requiredDeps.forEach(dep => {
        if (packageJson.dependencies && packageJson.dependencies[dep]) {
            console.log(`✅ ${dep} dependency found`);
        } else {
            missingDeps.push(dep);
            console.log(`❌ ${dep} dependency missing`);
        }
    });
    
    if (missingDeps.length > 0) {
        console.log(`\n🔧 Install missing dependencies:`);
        console.log(`npm install ${missingDeps.join(' ')}`);
    }
    
} catch (error) {
    console.log('❌ Error reading package.json:', error.message);
}

console.log('\n🔐 Checking environment variables...');

try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = ['BOT_TOKEN', 'MONGO_URI'];
    
    envVars.forEach(varName => {
        if (envContent.includes(varName)) {
            console.log(`✅ ${varName} found in .env`);
        } else {
            console.log(`❌ ${varName} missing from .env`);
        }
    });
    
} catch (error) {
    console.log('❌ Error reading .env file:', error.message);
}

console.log('\n📋 Deployment Checklist:');
console.log('□ Bot token from @BotFather');
console.log('□ MongoDB database URL (Atlas recommended)');
console.log('□ All dependencies installed');
console.log('□ Bot tested locally');
console.log('□ Git repository initialized (for some platforms)');

console.log('\n🚀 Ready to deploy!');
console.log('Run quick-deploy.bat (Windows) or quick-deploy.sh (Linux/Mac) for deployment instructions.');

if (missingFiles.length > 0) {
    console.log('\n⚠️  Fix missing files before deploying!');
    process.exit(1);
} else {
    console.log('\n✅ All required files present! Ready for deployment.');
}
