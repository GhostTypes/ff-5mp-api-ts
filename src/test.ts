// src/test.ts
import { FiveMClient } from './index';
import { FlashForgePrinterDiscovery, FlashForgePrinter, MachineState, FFGcodeFileEntry, FFGcodeToolData } from './index';


function failTest(reason: string) {
    console.error(reason);
    process.exit(69420);
}

async function testPrinterDiscovery() {
    console.log('=== FlashForge Printer Discovery Test ===');

    try {
        console.log('Starting printer discovery...');
        const discovery = new FlashForgePrinterDiscovery();

        // Discover printers with a 15-second timeout, 2-second idle timeout, and 2 retries
        const printers = await discovery.discoverPrintersAsync(15000, 2000, 2);

        if (printers.length > 0) {
            console.log(`\nFound ${printers.length} printer(s) on the network:`);

            printers.forEach((printer, index) => {
                console.log(`\nPrinter #${index + 1}:`);
                console.log(`  Name: ${printer.name}`);
                console.log(`  Serial Number: ${printer.serialNumber}`);
                console.log(`  IP Address: ${printer.ipAddress}`);
            });
        } else {
            console.log('\nNo printers found on the network.');
        }
    } catch (error) {
        console.error('\nError during printer discovery:', error);
    }
}

// Run the test
runTest().catch(error => {
    console.error('Unhandled error in test:', error);
});

async function testRecentFiles(client: FiveMClient) {
    console.log('\n=== Testing Recent File List (getRecentFileList) ===');
    try {
        const recentFiles = await client.files.getRecentFileList();
        if (recentFiles && recentFiles.length > 0) {
            console.log(`Retrieved ${recentFiles.length} recent files:`);
            recentFiles.forEach((file: FFGcodeFileEntry, index: number) => {
                console.log(`\nFile #${index + 1}:`);
                console.log(`  Name: ${file.gcodeFileName}`);
                console.log(`  Printing Time: ${file.printingTime}s`);
                if (file.totalFilamentWeight !== undefined) {
                    console.log(`  Total Filament Weight: ${file.totalFilamentWeight.toFixed(2)}g`);
                }
                if (file.useMatlStation !== undefined) {
                    console.log(`  Uses Material Station: ${file.useMatlStation}`);
                }
                if (file.gcodeToolCnt !== undefined) {
                    console.log(`  Tool Count: ${file.gcodeToolCnt}`);
                }
                if (file.gcodeToolDatas && file.gcodeToolDatas.length > 0) {
                    console.log('  Tool Data:');
                    file.gcodeToolDatas.forEach((toolData: FFGcodeToolData, toolIndex: number) => {
                        console.log(`    Tool ${toolData.toolId}:`);
                        console.log(`      Material: ${toolData.materialName} (${toolData.materialColor})`);
                        console.log(`      Filament Weight: ${toolData.filamentWeight.toFixed(2)}g`);
                        if (toolData.slotId !== undefined && toolData.slotId !== 0) {
                             console.log(`      Slot ID: ${toolData.slotId}`);
                        }
                    });
                } else if (typeof file === 'object' && !file.gcodeToolDatas && client.isAD5X) {
                    // If it's an AD5X and we expected tool data but didn't get it (for an object entry)
                    console.log('  Note: AD5X printer, but no detailed gcodeToolDatas found for this file. It might be an older file format or a non-multi-material print.');
                }
            });
        } else if (recentFiles) {
            console.log('No recent files found on the printer.');
        } else {
            console.error('Failed to retrieve recent files list (returned null/undefined).');
        }
    } catch (error) {
        console.error('Error during testRecentFiles:', error);
    }
}

async function runTest() {
    // Replace these values with your actual printer information
    const ipAddress = '192.168.0.202'; // Replace with your printer's IP
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
            console.log(`- Hot End Temperature: ${info.Extruder.current}°C`);
            console.log(`- Bed Temperature: ${info.PrintBed.current}°C`);
            console.log(`- Is AD5X: ${client.isAD5X}`); // Log if client identifies it as AD5X
            console.log(`- Is Pro: ${client.isPro}`);


            if (client.isAD5X && info.HasMatlStation) {
                console.log('\n=== AD5X Material Station Info (/detail) ===');
                if (info.MatlStationInfo) {
                    const msInfo = info.MatlStationInfo;
                    console.log('Material Station Details:');
                    console.log(`  Current Load Slot: ${msInfo.currentLoadSlot}`);
                    console.log(`  Current Active Slot: ${msInfo.currentSlot}`);
                    console.log(`  Total Slots: ${msInfo.slotCnt}`);
                    if (msInfo.slotInfos && msInfo.slotInfos.length > 0) {
                        console.log('  Slot Information:');
                        msInfo.slotInfos.forEach(slot => {
                            console.log(`    Slot ID: ${slot.slotId}`);
                            console.log(`      Has Filament: ${slot.hasFilament}`);
                            console.log(`      Material: ${slot.materialName} (${slot.materialColor})`);
                        });
                    } else {
                        console.log('  No detailed slot information available.');
                    }
                } else {
                    console.log('  Material Station Info not fully available in /detail response.');
                }

                if (info.IndepMatlInfo) {
                    const imInfo = info.IndepMatlInfo;
                    console.log('Independent Material Info:');
                    console.log(`  Material: ${imInfo.materialName} (${imInfo.materialColor})`);
                    console.log(`  State Action: ${imInfo.stateAction}, State Step: ${imInfo.stateStep}`);
                } else {
                     console.log('  Independent Material Info not available in /detail response.');
                }
            }


            if (info.Status === 'printing') {
                console.log('\nPrinter is printing:');
                console.log(`- Current file: ${info.PrintFileName}`);
                console.log(`- Progress: ${info.PrintProgressInt}%`);
                console.log(`- Current layer: ${info.CurrentPrintLayer} of ${info.TotalPrintLayers}`);
                console.log(`- Estimated time remaining: ${info.PrintEta}`);
            }

            // Check if we can get the local files list
            let files = await client.files.getLocalFileList()
            if (files.length < 1) failTest("No local files found, ensure the printer has at least one local file for proper testing.")
            console.log('Local file(s) count: ' + files.length);

            // Test recent files list (especially for AD5X)
            await testRecentFiles(client);

        } else {
            console.error('Failed to get printer information!');
        }

        // Close the connection

        console.log('\nTest completed.');
        client.dispose();
        console.log('Connection closed.');
        process.exit(0);

    } catch (error: unknown) {
        const err = error as Error;
        console.error(`Test failed with error: ${err.message}`);
        console.error(err.stack);
    }
}

// Run test function or uncomment to test printer discovery
// testPrinterDiscovery();
runTest().catch(error => {
    console.error('Unhandled error in test:', error);
});