import { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = process.env.NOTION_PAGE_ID!;

function extractTextFromRichText(
  richText: Array<{ plain_text: string }>
): string {
  return richText.map((t) => t.plain_text).join("");
}

function extractBlockText(block: BlockObjectResponse): string {
  switch (block.type) {
    case "paragraph":
      return extractTextFromRichText(
        block.paragraph.rich_text as Array<{ plain_text: string }>
      );
    case "heading_1":
      return extractTextFromRichText(
        block.heading_1.rich_text as Array<{ plain_text: string }>
      );
    case "heading_2":
      return extractTextFromRichText(
        block.heading_2.rich_text as Array<{ plain_text: string }>
      );
    case "heading_3":
      return extractTextFromRichText(
        block.heading_3.rich_text as Array<{ plain_text: string }>
      );
    case "bulleted_list_item":
      return (
        "- " +
        extractTextFromRichText(
          block.bulleted_list_item.rich_text as Array<{ plain_text: string }>
        )
      );
    case "numbered_list_item":
      return extractTextFromRichText(
        block.numbered_list_item.rich_text as Array<{ plain_text: string }>
      );
    case "callout":
      return extractTextFromRichText(
        block.callout.rich_text as Array<{ plain_text: string }>
      );
    case "toggle":
      return extractTextFromRichText(
        block.toggle.rich_text as Array<{ plain_text: string }>
      );
    case "quote":
      return extractTextFromRichText(
        block.quote.rich_text as Array<{ plain_text: string }>
      );
    default:
      return "";
  }
}

async function fetchAllBlocks(blockId: string): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      const b = block as BlockObjectResponse;
      blocks.push(b);

      // Recursively fetch children (tables, toggles, etc.)
      if (b.has_children) {
        const children = await fetchAllBlocks(b.id);
        blocks.push(...children);
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return blocks;
}

async function fetchTableRows(
  tableBlockId: string
): Promise<string[][]> {
  const rows: string[][] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: tableBlockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const row of response.results) {
      const r = row as BlockObjectResponse;
      if (r.type === "table_row") {
        const cells = (
          r.table_row as { cells: Array<Array<{ plain_text: string }>> }
        ).cells;
        rows.push(cells.map((cell) => extractTextFromRichText(cell)));
      }
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return rows;
}

export async function fetchNotionPageContent(): Promise<string> {
  const blocks = await fetchAllBlocks(PAGE_ID);
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === "table") {
      const rows = await fetchTableRows(block.id);
      if (rows.length > 0) {
        // Format as pipe-delimited table
        const header = rows[0].join(" | ");
        parts.push(header);
        parts.push(rows[0].map(() => "---").join(" | "));
        for (const row of rows.slice(1)) {
          parts.push(row.join(" | "));
        }
      }
    } else {
      const text = extractBlockText(block);
      if (text.trim()) {
        parts.push(text);
      }
    }
  }

  return parts.join("\n");
}
