// src/test.ts
import { FiveMClient } from './index';

async function runTest() {
    // Replace these values with your actual printer information
    const ipAddress = '192.168.0.201'; // Replace with your printer's IP
    const serialNumber = 'SNMOMC9900728'; // Replace with your printer's serial number
    const checkCode = 'e5c2bf77'; // Replace with your printer's check code

    console.log('=== FlashForge API Test ===');
    console.log(`Attempting to connect to printer at ${ipAddress}`);

    try {
        // Create the client
        const client = new FiveMClient(ipAddress, serialNumber, checkCode);
        console.log('Client created.');

        // Initialize the client and verify connection first
        console.log('Initializing connection...');
        const connected = await client.initialize();
        console.log(`Connection initialized: ${connected}`);

        if (!connected) {
            console.error('Failed to connect to the printer. Check your connection details.');
            return;
        }

        // Then proceed with other operations
        console.log('Initializing control...');
        const controlInitialized = await client.initControl();
        console.log(`Control initialized: ${controlInitialized}`);

        // Get printer info
        console.log('Getting printer information...');
        const info = await client.info.get();

        if (info) {
            console.log('Printer Information:');
            console.log(`- Name: ${info.Name}`);
            console.log(`- Firmware: ${info.FirmwareVersion}`);
            console.log(`- Status: ${info.Status}`);
            console.log(`- Current State: ${MachineState[info.MachineState]}`);
            console.log(`- Hot End Temperature: ${info.ExtruderTemp.value}°C`);
            console.log(`- Bed Temperature: ${info.PrintBedTemp.value}°C`);

            if (info.Status === 'printing') {
                console.log('\nPrinter is printing:');
                console.log(`- Current file: ${info.PrintFileName}`);
                console.log(`- Progress: ${info.PrintProgressInt}%`);
                console.log(`- Current layer: ${info.CurrentPrintLayer} of ${info.TotalPrintLayers}`);
                console.log(`- Estimated time remaining: ${info.PrintEta}`);
            }

            await client.control.setLedOn();

        } else {
            console.error('Failed to get printer information!');
        }

        // Close the connection
        //console.log('\nTest completed. Closing connection...');
        //client.dispose();
        //console.log('Connection closed.');

    } catch (error: unknown) {
        const err = error as Error;
        console.error(`Test failed with error: ${err.message}`);
        console.error(err.stack);
    }
}

// From your enums
enum MachineState {
    Ready,
    Busy,
    Calibrating,
    Error,
    Heating,
    Printing,
    Pausing,
    Paused,
    Cancelled,
    Completed,
    Unknown
}

// Run the test
runTest().catch(error => {
    console.error('Unhandled error in test:', error);
});