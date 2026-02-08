/**
 * @fileoverview Tests for FlashForgeTcpClient file list parsing logic, validating extraction
 * of filenames from M661 command responses across different printer models.
 */
import { FlashForgeTcpClient } from './FlashForgeTcpClient';

// Suppress logs (from API files) during tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  // Restore logging
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Expose the parseFileListResponse method for testing (hacky)
const parseFileListResponse = (response: string): string[] => {
  // @ts-expect-error
  const originalConnect = FlashForgeTcpClient.prototype.connect;
  // @ts-expect-error
  FlashForgeTcpClient.prototype.connect = jest.fn();
  const client = new FlashForgeTcpClient('localhost');
  // @ts-expect-error
  const result = client.parseFileListResponse(response);
  // @ts-expect-error
  FlashForgeTcpClient.prototype.connect = originalConnect;
  return result;
};

describe('FlashForgeTcpClient', () => {
  // Mock socket methods
  beforeAll(() => {
    jest.spyOn(FlashForgeTcpClient.prototype, 'dispose').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('parseFileListResponse', () => {
    it('should parse Pro model response correctly', () => {
      // Sample response from 5M Pro
      const proResponse = `D��D�::��!/data/UniversalConsoleStandx6.3mf::��/data/2x5Baseplate.3mf::��/data/Bin_1x5x5_x2.3mf`;

      const result = parseFileListResponse(proResponse);

      expect(result).toContain('UniversalConsoleStandx6.3mf');
      expect(result).toContain('2x5Baseplate.3mf');
      expect(result).toContain('Bin_1x5x5_x2.3mf');
      expect(result.length).toBe(3);
    });

    it('should parse regular 5M model response correctly', () => {
      // Sample response from regular 5M
      const regular5MResponse = `Dï¿½ï¿½D::ï¿½ï¿½'/data/First Layer Test Square 0.2.gcode::ï¿½ï¿½%/data/First Layer Test Square 0.2.3mf::ï¿½ï¿½/data/Part 2.gcode::ï¿½ï¿½/data/Part 1.gcode`;

      const result = parseFileListResponse(regular5MResponse);

      expect(result).toContain('First Layer Test Square 0.2.gcode');
      expect(result).toContain('First Layer Test Square 0.2.3mf');
      expect(result).toContain('Part 2.gcode');
      expect(result).toContain('Part 1.gcode');
      expect(result.length).toBe(4);
    });

    it('should handle responses with spaces and special characters in filenames', () => {
      const complexResponse = `D��D�::��"/data/GridfinityCalculatorBins.3mf::��#/data/Mason Jar Flower Lid Wood.3mf::��/data/test.3mf`;
      const result = parseFileListResponse(complexResponse);
      expect(result).toContain('GridfinityCalculatorBins.3mf');
      expect(result).toContain('Mason Jar Flower Lid Wood.3mf');
      expect(result).toContain('test.3mf');
      expect(result.length).toBe(3);
    });

    it('should handle empty responses', () => {
      const emptyResponse = '';
      const result = parseFileListResponse(emptyResponse);
      expect(result).toEqual([]);
    });

    it('should handle responses with no file paths', () => {
      const noFilesResponse = 'D��D�::��';
      const result = parseFileListResponse(noFilesResponse);
      expect(result).toEqual([]);
    });

    it('should handle the complete Pro response correctly', () => {
      // Full M661 response from 5M pro
      const fullProResponse = `D��D�::��!/data/UniversalConsoleStandx6.3mf::��/data/2x5Baseplate.3mf::��/data/Bin_1x5x5_x2.3mf::��/data/4x5Baseplate.3mf::��"/data/GridfinityCalculatorBins.3mf::��#/data/Mason Jar Flower Lid Wood.3mf::��/data/test.3mf::��⸮/data/FileUploadTest.gcode::��#/data/FlashPrintUploadTest.gcode.gx::��/data/Mason Jar Flower Lid.3mf::��"/data/platypus-trader-mini-stl.3mf::��(/data/wood-carved-wolf-sculpture-stl.3mf::��!/data/BirdbuddySpillshroud+v3.3mf::��/data/ASA Benchy.3mf::��4/data/ff-adventurer-5m-pro-internal-exhaust-duct.3mf::��3/data/ff-adventurer-5m-pro-100mm-duct-connector.3mf::��4/data/FF Adventurer 5m Pro External Exhuast Duct.3mf::��/data/USB C Port Cleaner x4.3mf::��/data/150-200g Spool Top.3mf::��/data/150-200g Spool Bottom.3mf::��;/data/Gridfinity_UltraLightBin_DividerEdition_1x4x5_1x4.3mf::��5/data/Gridfinity_UltraLightBin_PlainEdition_2x4x5.3mf::��;/data/Gridfinity_UltraLightBin_DividerEdition_2x2x5_2x3.3mf::��/data/MULTIGROOM-5000-BASE.3mf::��(/data/Gridfinity Deoderant Holder x3.3mf::��/data/Silca+Gel+Containerx4.3mf::��/data/Silca+Gel+Container.3mf::��/data/BuildPlateCover.3mf::�� /data/The+Mac+Vase_spiral150.3mf::��/data/SUNLU1kgSpoolHolderx3.3mf::��/data/SUNLU1kgSpoolHolder.3mf::��⸮/data/1kgSpoolHolderx4.3mf::��"/data/FlashForge1kgSpoolHolder.3mf::��/data/Amolen200gSpoolHolder.3mf::��/data/Mika3DSilkDarkPurple.3mf::��&/data/FilamentSampleBox-20x-Angled.3mf::��/data/FilamentSampleBox-20x.3mf::��/data/OVVWalnut.3mf::��/data/OVVOak.3mf::��/data/OVVTeakwood.3mf::��/data/OVV3DCherry.3mf::��/data/FlashForgeHSRed.3mf::��/data/SunluHSGrey.3mf::��/data/SunluHSWhite.3mf::��./data/FlashForgeBurntTitanium+NebulaPurple.3mf::��/data/3DHoJorGoldSilk.3mf::��/data/AmolenSilkRed+Green.3mf::��/data/AmolenSilkRed+Blue.3mf::��/data/AmolenSilkRed+Gold.3mf::��/data/iSHANGUBlueGlitter.3mf::��/data/SunluOliveGreen.3mf::��/data/support.3mf::��/data/frame-right-3-shelf.3mf::��/data/frame-left-3-shelf.3mf::��/data/DisplayShelf x3.3mf::��#/data/Stackable Benchy Shelf x3.3mf::��/data/FlexiGuitar.3mf::�� /data/PIP+Guitar+Pick+Box+V2.3mf::��/data/Guitar Picks x6.3mf::��/data/Dad Trophy.3mf::��/data/wood-chicken.3mf::��/data/wood-eagle-on-perch.3mf::��/data/TulipVase.3mf::��/data/eclipse-bloom-vase.3mf::��/data/SnailPlanter.3mf::��⸮/data/Silk Benchy Test.3mf::��⸮/data/3x Bottle Wrench.3mf::��/data/HS Benchy.3mf::��#/data/Heart Hands Candle Holder.3mf::�� /data/Groot Log Wood PLA 0.6.3mf::��/data/0.6 Wood Benchy Rev1.3mf::��/data/BabyGrootWood.3mf::��ata/Filament Clips x6.3mf::��/data/Wood Benchy v1.3mf::��/data/HeartBear.3mf::��/data/DadSpaceChess.3mf::��/data/9_11_memorial.3mf::��/data/Pawn x4.3mf::��/data/Bishop x2.3mf::��/data/2x Rook + 2x Bishop.3mf::��ata/Transparent Twist.3mf::��/data/Silk Lego Flowers x2.3mf::��/data/Lego Flower Stem Set.3mf::��/data/Silk Lego Flower Pot.3mf::��"/data/Happy Birthday Aunt Rere.3mf::��⸮/data/Star+Trophy+Base.3mf::��⸮/data/Star+Trophy+Star.3mf::��/data/fanculo.3mf::��/data/Little_Boy_Bomb.3mf::��/data/DC_WhiteHouse.3mf::��/data/Chess Queen.3mf::��/data/Chess King.3mf::��/data/Benchy.3mf::��/data/Jewlery Holder Base.3mf::��/data/Jewlery_Tree_Side_2.3mf::��/data/Jewlery_Tree_Side_1.3mf::��"/data/Minecraft Ore Keycap Set.3mf::��/data/EscapeKey.3mf::��/data/LeftShift.3mf::��/data/SpacebarTestTwo.3mf::��/data/Spacebar.3mf::��/data/NumKeysLarge.3mf::��/data/Extras 1.3mf::��/data/NumKeys1.3mf::��/data/Numpad Keys Test 2.3mf::��/data/key+cap+v6.3mf::��/data/Arrow Keys.3mf::��ata/Arrow Keys Test 2.3mf::��ata/Arrow Keys Test 1.3mf::��/data/InsHomeEtc Set.3mf::��⸮/data/Outer Keys Set 1.3mf::��&/data/razer keycap stabilizer test.3mf::��/data/Keys Test 4.3mf::��/data/CTRL_key.3mf::��/data/Misc Keys.3mf::��/data/F Top Row Blackwidow.3mf::��*/data/Top Row Transparent + White Text.3mf::��/data/Transparent Key Test.3mf::��/data/2 Key Test.3mf::��/data/EasyKeycap.3mf::��/data/Keycap Test.3mf::��*/data/Transparent Keys A-Z Test + Brim.3mf::��0/data/Articulated+Christmas+Star+Transparent.3mf::��!/data/Knitting Needles Test 1.3mf::��/data/10cmXLShelf.3mf::��/data/10cm XXL.3mf::��#/data/10cm Center Connectors x8.3mf::��/data/Shelf Connectors x3.3mf::��*/data/10cm Display Shelf SmallMedLarge.3mf::��/data/4 Tier Display Shelf.3mf::��"/data/Gridfinity_Baseplate_4x4.3mf::��"/data/Gridfinity_Baseplate_2x4.3mf::��$/data/3x2 Rugged Drawer Outer x2.3mf`;

      const result = parseFileListResponse(fullProResponse);

      expect(result).toContain('UniversalConsoleStandx6.3mf');
      expect(result).toContain('2x5Baseplate.3mf');
      expect(result).toContain('Bin_1x5x5_x2.3mf');
      // The number will be approximate due to potentially malformed entries
      expect(result.length).toBeGreaterThan(50);
    });

    it('should handle the complete regular 5M response correctly', () => {
      // Full M661 response from regular 5M
      const fullRegular5MResponse = `Dï¿½ï¿½D::ï¿½ï¿½'/data/First Layer Test Square 0.2.gcode::ï¿½ï¿½%/data/First Layer Test Square 0.2.3mf::ï¿½ï¿½/data/Part 2.gcode::ï¿½ï¿½/data/Part 1.gcode::ï¿½ï¿½%/data/Drawer 78mm (PETG) 20m11s.gcode::ï¿½ï¿½$/data/Frame 80mm (PETG) 59m11s.gcode::ï¿½ï¿½2/data/First Layer Test Square 0.2_PETG_4m24s.gcode::ï¿½ï¿½/data/Cube-PLA-Test.gcode::ï¿½ï¿½/data/Boat_PLA_14m3s.gcode::ï¿½ï¿½*/data/Mobile phone holder_PLA_39m30s.gcode::ï¿½ï¿½ /data/Touch Pen_PLA_41m14s.gcode::ï¿½ï¿½/data/Keychain_PLA_4m7s.gcode::ï¿½ï¿½//data/Desk Oragnizer 60percent_PLA_57m28s.gcode::ï¿½ï¿½+/data/Concave Dodecahedron_PLA_38m12s.gcode::ï¿½ï¿½/data/Icecream_PLA_1h2m.gcode`;
      const result = parseFileListResponse(fullRegular5MResponse);
      expect(result).toContain('First Layer Test Square 0.2.gcode');
      expect(result).toContain('First Layer Test Square 0.2.3mf');
      expect(result).toContain('Part 2.gcode');
      expect(result).toContain('Part 1.gcode');
      expect(result).toContain('Drawer 78mm (PETG) 20m11s.gcode');
      expect(result).toContain('Frame 80mm (PETG) 59m11s.gcode');
      expect(result).toContain('First Layer Test Square 0.2_PETG_4m24s.gcode');
      expect(result).toContain('Cube-PLA-Test.gcode');
      expect(result).toContain('Boat_PLA_14m3s.gcode');
      expect(result).toContain('Mobile phone holder_PLA_39m30s.gcode');
      expect(result).toContain('Touch Pen_PLA_41m14s.gcode');
      expect(result).toContain('Keychain_PLA_4m7s.gcode');
      expect(result).toContain('Desk Oragnizer 60percent_PLA_57m28s.gcode');
      expect(result).toContain('Concave Dodecahedron_PLA_38m12s.gcode');
      expect(result).toContain('Icecream_PLA_1h2m.gcode');
      expect(result.length).toBe(15);
    });
  });
});
