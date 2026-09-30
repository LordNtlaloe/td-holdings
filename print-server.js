// server/print-server.js
import express from 'express';
import cors from 'cors';
import { writeFile } from 'fs/promises';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Function to open cash drawer
async function openCashDrawer() {
    console.log('Opening cash drawer...');
    try {
        const buffer = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0x19]);
        await writeFile('/dev/usb/lp0', buffer);
        console.log('Cash drawer opened');
        return true;
    } catch (error) {
        console.error('Failed to open cash drawer:', error.message);
        return false;
    }
}

app.post('/api/print', async (req, res) => {
    try {
        const { receiptData, paymentMethod } = req.body;

        // Debug logging
        console.log('=== RECEIVED REQUEST ===');
        console.log('Payment method received:', paymentMethod);
        console.log('Payment method type:', typeof paymentMethod);
        console.log('Payment method length:', paymentMethod?.length);
        console.log('Full request body keys:', Object.keys(req.body));
        
        // Convert array back to Buffer
        const buffer = Buffer.from(receiptData);
        
        // Check if payment method is Cash (case insensitive)
        const isCash = paymentMethod && paymentMethod.toLowerCase() === 'cash';
        console.log(`Is cash payment? ${isCash}`);
        
        if (isCash) {
            console.log('Cash payment detected - opening drawer');
            const drawerCommand = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0x19]);
            const fullBuffer = Buffer.concat([drawerCommand, buffer]);
            await writeFile('/dev/usb/lp0', fullBuffer);
            console.log('Receipt printed and drawer opened');
        } else {
            console.log(`Non-cash payment (${paymentMethod}) - drawer not opened`);
            await writeFile('/dev/usb/lp0', buffer);
            console.log('Receipt printed (drawer not opened)');
        }

        res.json({ success: true, message: 'Receipt printed successfully' });
    } catch (error) {
        console.error('Print error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        printer: '/dev/usb/lp0',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint - opens drawer without printing (for testing)
app.post('/api/test-drawer', async (req, res) => {
    console.log('Testing cash drawer...');
    const opened = await openCashDrawer();
    res.json({ 
        success: opened, 
        message: opened ? 'Drawer opened' : 'Failed to open drawer' 
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Print server running on http://0.0.0.0:${PORT}`);
    console.log(`Printer device: /dev/usb/lp0`);
    console.log(`Cash drawer will only open for CASH payments`);
});