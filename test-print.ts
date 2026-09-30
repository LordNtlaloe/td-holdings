// test-print.js
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

async function testPrint() {
    try {
        // Send a simple text to the printer
        const testText = 'Hello from POS!\n\n';
        await execAsync(`echo "${testText}" > /dev/usb/lp0`);
        console.log('Test print sent successfully!');
    } catch (error) {
        console.error('Error:', error);
    }
}

testPrint();