// server.js
import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();

// SIMPLIFIED CORS configuration - Allow all origins for testing
app.use(cors({
    origin: '*',  // Allow all origins for now
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Handle pre-flight requests
app.options('*', cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/submissions', express.static(path.join(__dirname, 'submissions')));

// GoDaddy SMTP Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: process.env.TLS_REJECT_UNAUTHORIZED === 'false' ? false : true
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    debug: true,
    logger: false
});

// Test SMTP connection on startup
transporter.verify(function(error, success) {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 TESTING GODADDY SMTP CONNECTION');
    console.log('='.repeat(70));
    
    if (error) {
        console.log('❌ SMTP CONNECTION FAILED:', error.message);
        console.log('Troubleshooting tips:');
        console.log('1. Check if credentials are correct');
        console.log('2. Ensure Less Secure Apps is enabled');
        console.log('3. Try using App Password instead of regular password');
        console.log('4. Check if SMTP server is correct: smtpout.secureserver.net');
    } else {
        console.log('✅ SMTP CONNECTION SUCCESSFUL!');
        console.log(`📧 Email: ${process.env.EMAIL_USER}`);
        console.log(`🌐 Server: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`);
        console.log('🚀 Ready to send emails!');
    }
    console.log('='.repeat(70) + '\n');
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'NL Digital Solutions Email Server',
        email: process.env.EMAIL_USER,
        endpoints: {
            health: '/health',
            test: '/test',
            'test-smtp': '/test-smtp',
            'send-with-reply': '/send-with-reply',
            'view-submissions': '/submissions/view'
        }
    });
});

// Test SMTP endpoint
app.get('/test-smtp', async (req, res) => {
    try {
        const connectionResult = await transporter.verify();
        res.json({
            success: true,
            message: 'SMTP connection verified',
            details: connectionResult
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'SMTP connection failed',
            message: error.message
        });
    }
});

// Test email endpoint
app.get('/test', async (req, res) => {
    try {
        const testEmail = await transporter.sendMail({
            from: `"NL Digital Solutions" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: '✅ NL Digital Solutions - Server Test',
            text: `Test email from your Node.js server\n\nTime: ${new Date().toLocaleString()}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                    <h1 style="margin: 0;">✅ Test Email Successful</h1>
                    <p>NL Digital Solutions Email Server</p>
                </div>
                <div style="padding: 20px; background: #f8fafc; border-radius: 10px; margin-top: 20px;">
                    <p>Your email server is working correctly!</p>
                    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Email:</strong> ${process.env.EMAIL_USER}</p>
                </div>
            </div>
            `
        });
        
        console.log('✅ Test email sent:', testEmail.messageId);
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            messageId: testEmail.messageId
        });
    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send test email',
            message: error.message
        });
    }
});

// MAIN CONTACT FORM ENDPOINT - SIMPLIFIED
app.post('/send-with-reply', async (req, res) => {
    console.log('\n📧 Received contact form submission');
    console.log('Time:', new Date().toLocaleString());
    console.log('Client IP:', req.ip);
    console.log('Body:', req.body);
    
    const { name, email, phone, service, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !service || !message) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields',
            received: { name, email, service, message }
        });
    }
    
    const submissionId = 'NL' + Date.now().toString().slice(-8);
    const timestamp = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
    
    console.log(`Processing submission: ${submissionId}`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Service: ${service}`);
    
    try {
        // 1. Send email to support (try-catch each email separately)
        let supportResult = null;
        let autoReplyResult = null;
        
        try {
            const supportEmail = {
                from: `"NL Digital Solutions Website" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                replyTo: email,
                subject: `📧 New Contact: ${name} - ${service}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
                    <div style="background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0;">New Contact Form Submission</h1>
                        <p>NL Digital Solutions Website</p>
                    </div>
                    <div style="padding: 30px; background: #f8fafc;">
                        <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                            <h2 style="color: #8b5cf6; margin-top: 0;">Client Information</h2>
                            <p><strong>Name:</strong> ${name}</p>
                            <p><strong>Email:</strong> ${email}</p>
                            <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                            <p><strong>Service:</strong> ${service}</p>
                            <p><strong>Reference:</strong> ${submissionId}</p>
                        </div>
                        <div style="background: white; padding: 20px; border-radius: 10px;">
                            <h3 style="color: #8b5cf6; margin-top: 0;">Message</h3>
                            <p>${message.replace(/\n/g, '<br>')}</p>
                        </div>
                    </div>
                    <div style="background: #1f2937; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
                        <p>Submitted: ${timestamp}</p>
                    </div>
                </div>
                `
            };
            
            supportResult = await transporter.sendMail(supportEmail);
            console.log('✅ Support email sent:', supportResult.messageId);
        } catch (emailError) {
            console.error('❌ Support email failed:', emailError.message);
        }
        
        // 2. Send auto-reply to client
        try {
            const autoReplyEmail = {
                from: `"NL Digital Solutions" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `We've received your inquiry - NL Digital Solutions`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(90deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 40px; text-align: center;">
                        <h1 style="margin: 0;">Thank You, ${name}!</h1>
                        <p>Your inquiry has been received</p>
                    </div>
                    <div style="padding: 30px;">
                        <p>Dear ${name},</p>
                        <p>Thank you for contacting NL Digital Solutions regarding our ${service} service.</p>
                        
                        <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #065f46; margin-top: 0;">What Happens Next?</h3>
                            <p>• Our team will review your requirements</p>
                            <p>• You'll receive a detailed proposal within <strong>24-48 hours</strong></p>
                            <p>• We'll contact you at ${phone || 'your email'}</p>
                        </div>
                        
                        <p><strong>Reference:</strong> ${submissionId}</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://wa.me/27817218350" style="background: #25D366; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">
                                💬 Chat on WhatsApp for Fast Response
                            </a>
                        </div>
                    </div>
                    <div style="background: #f8fafc; padding: 20px; text-align: center; color: #6b7280;">
                        <p>NL Digital Solutions | support@nldigitalsolutions.co.za | 081 721 8350</p>
                    </div>
                </div>
                `
            };
            
            autoReplyResult = await transporter.sendMail(autoReplyEmail);
            console.log('✅ Auto-reply sent to client:', autoReplyResult.messageId);
        } catch (emailError) {
            console.error('❌ Auto-reply email failed:', emailError.message);
        }
        
        // 3. Save to file
        const submission = {
            id: submissionId,
            timestamp: new Date().toISOString(),
            name,
            email,
            phone: phone || 'Not provided',
            service,
            message,
            status: 'sent',
            emails: {
                support: supportResult?.messageId || 'failed',
                autoReply: autoReplyResult?.messageId || 'failed'
            }
        };
        
        saveSubmissionToFile(submission);
        
        // Return success even if emails failed
        res.json({
            success: true,
            message: 'Form submitted successfully',
            data: {
                reference: submissionId,
                name,
                email,
                service,
                timestamp,
                emails_sent: {
                    to_support: !!supportResult,
                    to_client: !!autoReplyResult
                }
            }
        });
        
    } catch (error) {
        console.error('❌ General error:', error.message);
        
        // Save even if error occurs
        const submission = {
            id: submissionId,
            timestamp: new Date().toISOString(),
            name,
            email,
            phone: phone || 'Not provided',
            service,
            message,
            status: 'failed',
            error: error.message
        };
        
        saveSubmissionToFile(submission);
        
        // Return error but with saved reference
        res.status(500).json({
            success: false,
            error: 'Processing failed, but submission was saved',
            data: {
                reference: submissionId,
                savedLocally: true
            }
        });
    }
});

// Simple send endpoint
app.post('/send', async (req, res) => {
    const { name, email, phone, service, message } = req.body;
    
    console.log('📨 Simple send endpoint called');
    
    try {
        const result = await transporter.sendMail({
            from: `"NL Digital Solutions" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `Contact Form: ${name}`,
            text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nService: ${service}\nMessage: ${message}`,
            html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p><strong>Service:</strong> ${service}</p>
            <p><strong>Message:</strong> ${message}</p>
            <p><em>Time: ${new Date().toLocaleString()}</em></p>
            `
        });
        
        console.log('✅ Simple email sent:', result.messageId);
        
        res.json({
            success: true,
            messageId: result.messageId
        });
    } catch (error) {
        console.error('❌ Simple send error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Save submission endpoint
app.post('/save-submission', (req, res) => {
    const submission = {
        id: 'BACKUP-' + Date.now().toString().slice(-8),
        timestamp: new Date().toISOString(),
        ...req.body
    };
    
    saveSubmissionToFile(submission);
    
    console.log('📁 Submission saved locally:', submission.id);
    
    res.json({
        success: true,
        message: 'Saved locally',
        data: submission
    });
});

// View submissions
app.get('/submissions/view', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'submissions', 'submissions.json');
        if (!fs.existsSync(filePath)) {
            return res.json({ submissions: [] });
        }
        
        const data = fs.readFileSync(filePath, 'utf8');
        const submissions = JSON.parse(data || '[]');
        
        res.json({ 
            count: submissions.length,
            submissions: submissions.slice(-20).reverse() // Show last 20
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        server: 'NL Digital Solutions Email Server',
        version: '2.0.1',
        email: process.env.EMAIL_USER,
        smtp: `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`
    });
});

// Helper function to save submissions
function saveSubmissionToFile(submission) {
    try {
        const dir = path.join(__dirname, 'submissions');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        const filePath = path.join(dir, 'submissions.json');
        let submissions = [];
        
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            submissions = JSON.parse(data || '[]');
        }
        
        submissions.push(submission);
        fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2));
        
        console.log(`📁 Saved to file: ${submission.id}`);
    } catch (error) {
        console.error('Error saving submission:', error);
    }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 NL DIGITAL SOLUTIONS EMAIL SERVER');
    console.log('='.repeat(60));
    console.log(`📡 Port: ${PORT}`);
    console.log(`📧 Email: ${process.env.EMAIL_USER}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🌍 CORS: Enabled for all origins`);
    console.log('='.repeat(60));
    console.log('\n✅ Server is running!');
    console.log('\nTest endpoints:');
    console.log(`• Health: http://localhost:${PORT}/health`);
    console.log(`• Test SMTP: http://localhost:${PORT}/test-smtp`);
    console.log(`• Test Email: http://localhost:${PORT}/test`);
    console.log('='.repeat(60));
});