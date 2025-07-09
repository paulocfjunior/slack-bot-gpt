import { beforeAll, describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';

import { generateKPIImage } from './generateKpiImage';

// Test data configurations for different scenarios
const testConfigs = [
  {
    name: 'Positive KPI',
    data: {
      kpiName: 'Revenue Growth',
      kpiValue: '$125,420',
      kpiFooterDiffColor: 'positive',
      kpiFooterDiff: '+12.5%',
    },
  },
  {
    name: 'Negative KPI',
    data: {
      kpiName: 'Customer Churn Rate',
      kpiValue: '8.2%',
      kpiFooterDiffColor: 'negative',
      kpiFooterDiff: '-2.1%',
    },
  },
  {
    name: 'Neutral KPI',
    data: {
      kpiName: 'Active Users',
      kpiValue: '45,230',
      kpiFooterDiffColor: '',
      kpiFooterDiff: '0.0%',
    },
  },
  {
    name: 'Long KPI Name',
    data: {
      kpiName: 'Monthly Recurring Revenue (MRR)',
      kpiValue: '$89,750',
      kpiFooterDiffColor: 'positive',
      kpiFooterDiff: '+8.3%',
    },
  },
  {
    name: 'Large Value',
    data: {
      kpiName: 'Total Sales',
      kpiValue: '$1,234,567',
      kpiFooterDiffColor: 'positive',
      kpiFooterDiff: '+15.7%',
    },
  },
  {
    name: 'Small Value',
    data: {
      kpiName: 'Conversion Rate',
      kpiValue: '2.4%',
      kpiFooterDiffColor: 'negative',
      kpiFooterDiff: '-0.8%',
    },
  },
];

// Global output directory for test images
const outputDir = path.join(process.cwd(), 'test-output');

describe('generateKPIImage', () => {
  beforeAll(() => {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  describe('Basic functionality', () => {
    it('should generate a PNG buffer for valid KPI data', async () => {
      const testData = {
        kpiName: 'Test KPI',
        kpiValue: '$50,000',
        kpiFooterDiffColor: 'positive',
        kpiFooterDiff: '+5.2%',
      };

      const buffer = await generateKPIImage(testData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it's a PNG file (PNG files start with specific bytes)
      expect(buffer[0]).toBe(0x89); // PNG signature
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    });

    it('should handle different KPI data types', async () => {
      const testCases = [
        {
          kpiName: 'Percentage',
          kpiValue: '15.5%',
          kpiFooterDiffColor: 'positive',
          kpiFooterDiff: '+2.1%',
        },
        {
          kpiName: 'Number',
          kpiValue: '1,234',
          kpiFooterDiffColor: 'negative',
          kpiFooterDiff: '-5.0%',
        },
        {
          kpiName: 'Currency',
          kpiValue: '$99,999.99',
          kpiFooterDiffColor: 'positive',
          kpiFooterDiff: '+12.3%',
        },
      ];

      for (const testCase of testCases) {
        const buffer = await generateKPIImage(testCase);
        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Visual validation tests', () => {
    testConfigs.forEach(config => {
      it(`should generate image for ${config.name}`, async () => {
        const buffer = await generateKPIImage(config.data);

        expect(buffer).toBeInstanceOf(Buffer);
        expect(buffer.length).toBeGreaterThan(0);

        // Save the image for visual inspection
        const filename = `${config.name.toLowerCase().replace(/\s+/g, '-')}.png`;
        const filepath = path.join(outputDir, filename);
        fs.writeFileSync(filepath, buffer);

        // Verify file was created and has content
        expect(fs.existsSync(filepath)).toBe(true);
        expect(fs.statSync(filepath).size).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty footer diff color', async () => {
      const testData = {
        kpiName: 'Test KPI',
        kpiValue: '$50,000',
        kpiFooterDiffColor: '',
        kpiFooterDiff: '0.0%',
      };

      const buffer = await generateKPIImage(testData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle very long KPI names', async () => {
      const testData = {
        kpiName:
          'This is a very long KPI name that might cause layout issues in the template',
        kpiValue: '$50,000',
        kpiFooterDiffColor: 'positive',
        kpiFooterDiff: '+5.2%',
      };

      const buffer = await generateKPIImage(testData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should handle very large values', async () => {
      const testData = {
        kpiName: 'Large Value Test',
        kpiValue: '$999,999,999,999.99',
        kpiFooterDiffColor: 'positive',
        kpiFooterDiff: '+999.9%',
      };

      const buffer = await generateKPIImage(testData);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should throw error for missing required fields', async () => {
      const invalidData = {
        kpiName: 'Test KPI',
        // Missing kpiValue
        kpiFooterDiffColor: 'positive',
        kpiFooterDiff: '+5.2%',
      };

      await expect(generateKPIImage(invalidData as any)).rejects.toThrow();
    });
  });
});

// Helper functions for manual testing (can be used outside of Jest)
export const generateAllTestImages = async (): Promise<void> => {
  console.log('🚀 Starting KPI image generation tests...\n');

  for (const config of testConfigs) {
    try {
      console.log(`📊 Generating: ${config.name}`);

      const buffer = await generateKPIImage(config.data);

      // Save the image with a descriptive filename
      const filename = `${config.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      const filepath = path.join(outputDir, filename);

      fs.writeFileSync(filepath, buffer);

      console.log(`✅ Saved: ${filename}`);
    } catch (error) {
      console.error(`❌ Error generating ${config.name}:`, error);
    }
  }

  console.log(`\n🎉 All test images saved to: ${outputDir}`);
};

export const generateCustomTestImage = async (
  customData: {
    kpiName: string;
    kpiValue: string;
    kpiFooterDiffColor: string;
    kpiFooterDiff: string;
  },
  filename?: string,
): Promise<string> => {
  console.log('🎨 Generating custom KPI image...');

  const buffer = await generateKPIImage(customData);

  // Generate filename if not provided
  const finalFilename = filename || `custom-${Date.now()}.png`;
  const filepath = path.join(outputDir, finalFilename);

  fs.writeFileSync(filepath, buffer);

  console.log(`✅ Custom image saved: ${finalFilename}`);
  return filepath;
};

export const quickTest = async (): Promise<void> => {
  console.log('⚡ Running quick test...');

  const sampleData = {
    kpiName: 'Quick Test KPI',
    kpiValue: '$50,000',
    kpiFooterDiffColor: 'positive',
    kpiFooterDiff: '+5.2%',
  };

  try {
    const filepath = await generateCustomTestImage(
      sampleData,
      'quick-test.png',
    );
    console.log(`✅ Quick test completed! Image saved to: ${filepath}`);
  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
};

// Example configurations for manual testing
export const examples = {
  runAllTests: generateAllTestImages,
  customImage: generateCustomTestImage,
  quickTest,
  customConfigs: {
    sales: {
      kpiName: 'Monthly Sales',
      kpiValue: '$75,000',
      kpiFooterDiffColor: 'positive',
      kpiFooterDiff: '+12.3%',
    },
    users: {
      kpiName: 'Daily Active Users',
      kpiValue: '12,450',
      kpiFooterDiffColor: 'negative',
      kpiFooterDiff: '-3.1%',
    },
    conversion: {
      kpiName: 'Lead Conversion Rate',
      kpiValue: '3.8%',
      kpiFooterDiffColor: 'positive',
      kpiFooterDiff: '+0.5%',
    },
  },
};
