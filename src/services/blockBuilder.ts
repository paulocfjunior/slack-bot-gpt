import {
  AnyBlock,
  ImageBlock,
  RichTextBlock,
  RichTextElement,
  SectionBlock,
} from '@slack/types';

export default class InsightBuilder {
  private blocks: AnyBlock[] = [];

  constructor() {
    this.blocks = [];
  }

  getBlocks(): AnyBlock[] {
    return this.blocks;
  }

  text(text: string): InsightBuilder {
    const block: SectionBlock = {
      type: 'section',
      text: {
        type: 'plain_text',
        text,
      },
    };

    this.blocks.push(block);

    return this;
  }

  image(insightImageUrl: string, altText: string = 'Image'): InsightBuilder {
    const block: ImageBlock = {
      type: 'image',
      image_url: insightImageUrl,
      alt_text: altText,
    };

    this.blocks.push(block);

    return this;
  }

  insight(insightTitle: string, ...insightActions: string[]): InsightBuilder {
    const block: RichTextBlock = {
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_quote',
          elements: [
            {
              type: 'text',
              text: `${insightTitle}\n`,
              style: {
                bold: true,
              },
            },
            ...insightActions
              .map(oneLineAction => this.oneLineAction(oneLineAction))
              .flat(),
          ],
        },
      ],
    };

    this.blocks.push(block);

    return this;
  }

  private oneLineAction(actionText: string): RichTextElement[] {
    return [
      {
        type: 'emoji',
        name: 'zap',
      },
      {
        type: 'text',
        text: ' ',
      },
      {
        type: 'text',
        text: `${actionText}\n`,
      },
    ];
  }
}
