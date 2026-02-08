/**
 * Quick test script to verify printer discovery works
 * Run with: node scripts/test-discovery.js
 */

// Import the built version
const { PrinterDiscovery } = require('../dist/api/PrinterDiscovery.js');

async function testDiscovery() {
    console.log('Starting FlashForge printer discovery...');
    console.log('This will scan for 10 seconds. Press Ctrl+C to stop early.\n');

    const discovery = new PrinterDiscovery();

    try {
        const printers = await discovery.discover({
            timeout: 10000,
            idleTimeout: 2000
        });

        console.log(`\nFound ${printers.length} printer(s):`);

        if (printers.length === 0) {
            console.log('  No printers found on the network.');
            console.log('  Make sure:');
            console.log('    - You are on the same network as your printer(s)');
            console.log('    - Your printer(s) are powered on');
            console.log('    - UDP multicast/broadcast is not blocked by your firewall');
        } else {
            printers.forEach((printer, index) => {
                console.log(`\n${index + 1}. ${printer.name}`);
                console.log(`   Model: ${printer.model}`);
                console.log(`   IP: ${printer.ipAddress}:${printer.commandPort}`);
                console.log(`   Protocol: ${printer.protocolFormat}`);

                if (printer.serialNumber) {
                    console.log(`   Serial: ${printer.serialNumber}`);
                }
                if (printer.eventPort) {
                    console.log(`   HTTP API: ${printer.ipAddress}:${printer.eventPort}`);
                }
                if (printer.status !== undefined) {
                    console.log(`   Status: ${printer.status === 0 ? 'Ready' : printer.status === 1 ? 'Busy' : printer.status === 2 ? 'Error' : 'Unknown'}`);
                }
            });
        }

        console.log('\n✓ Discovery test complete!');
        process.exitCode = printers.length > 0 ? 0 : 1;
    } catch (error) {
        console.error('✗ Discovery failed:', error.message);
        console.error(error.stack);
        process.exitCode = 1;
    }
}

testDiscovery();
