// test-titan.js - Special Titan Email tester
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔧 TITAN EMAIL SMTP TESTER');
console.log('='.repeat(50));

const configs = [
    {
        name: 'Port 587 (STARTTLS)',
        host: 'smtp.titan.email',
        port: 587,
        secure: false
    },
    {
        name: 'Port 465 (SSL)',
        host: 'smtp.titan.email',
        port: 465,
        secure: true
    },
    {
        name: 'GoDaddy Alternative',
        host: 'smtpout.secureserver.net',
        port: 465,
        secure: true
    },
    {
        name: 'GoDaddy Alternative 2',
        host: 'smtpout.secureserver.net',
        port: 587,
        secure: false
    }
];

async function testConfig(config) {
    console.log(`\n🔧 Testing: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Secure: ${config.secure}`);
    
    const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    
    try {
        // Test connection
        await transporter.verify();
        console.log('   ✅ Connection successful!');
        
        // Test sending
        const info = await transporter.sendMail({
            from: `"Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: `Test: ${config.name}`,
            text: `Testing ${config.host}:${config.port}`
        });
        
        console.log(`   ✅ Email sent: ${info.messageId}`);
        console.log(`   🎉 ${config.name} WORKS!`);
        
        return { success: true, config: config, info: info };
        
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        return { success: false, config: config, error: error.message };
    }
}

async function main() {
    console.log(`\n📧 Email: ${process.env.EMAIL_USER}`);
    console.log('🔑 Password: ********');
    console.log('\nStarting tests...\n');
    
    const results = [];
    
    for (const config of configs) {
        const result = await testConfig(config);
        results.push(result);
        
        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    
    const workingConfigs = results.filter(r => r.success);
    
    if (workingConfigs.length > 0) {
        console.log('\n✅ WORKING CONFIGURATIONS:');
        workingConfigs.forEach(result => {
            console.log(`\n   ${result.config.name}`);
            console.log(`   Host: ${result.config.host}`);
            console.log(`   Port: ${result.config.port}`);
            console.log(`   Secure: ${result.config.secure}`);
        });
        
        const bestConfig = workingConfigs[0].config;
        console.log('\n💡 UPDATE YOUR .env FILE WITH:');
        console.log(`SMTP_HOST=${bestConfig.host}`);
        console.log(`SMTP_PORT=${bestConfig.port}`);
        console.log(`SMTP_SECURE=${bestConfig.secure}`);
        
    } else {
        console.log('\n❌ NO WORKING CONFIGURATIONS FOUND');
        console.log('\n🔧 NEXT STEPS:');
        console.log('1. Verify email/password are correct');
        console.log('2. Log into https://login.titan.email/');
        console.log('3. Check if account is active');
        console.log('4. Contact GoDaddy support');
        console.log('5. Use Gmail as fallback');
    }
    
    console.log('\n' + '='.repeat(50));
}

main().catch(console.error);