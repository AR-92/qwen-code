/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { makeRelative, shortenPath } from '../utils/paths.js';
import type { ToolInvocation, ToolLocation, ToolResult } from './tools.js';
import { BaseDeclarativeTool, BaseToolInvocation, Kind } from './tools.js';

import type { PartUnion } from '@google/genai';
import {
  processSingleFileContent,
  getSpecificMimeType,
} from '../utils/fileUtils.js';
import type { Config } from '../config/config.js';
import { FileOperation } from '../telemetry/metrics.js';
import { getProgrammingLanguage } from '../telemetry/telemetry-utils.js';
import { logFileOperation } from '../telemetry/loggers.js';
import { FileOperationEvent } from '../telemetry/types.js';

/**
 * Parameters for the OptimizedReadFile tool
 */
export interface OptimizedReadFileToolParams {
  /**
   * The absolute path to the file to read
   */
  absolute_path: string;

  /**
   * The line number to start reading from (optional)
   */
  offset?: number;

  /**
   * The number of lines to read (optional)
   */
  limit?: number;

  /**
   * Whether to only read essential parts of the file (e.g., function/class definitions, 
   * important comments like TODOs, etc.) rather than the entire content
   */
  essential_only?: boolean;

  /**
   * Optional search pattern to find specific content within the file
   */
  search_pattern?: string;
}

class OptimizedReadFileToolInvocation extends BaseToolInvocation<
  OptimizedReadFileToolParams,
  ToolResult
> {
  constructor(
    private config: Config,
    params: OptimizedReadFileToolParams,
  ) {
    super(params);
  }

  getDescription(): string {
    const relativePath = makeRelative(
      this.params.absolute_path,
      this.config.getTargetDir(),
    );
    return shortenPath(relativePath);
  }

  override toolLocations(): ToolLocation[] {
    return [{ path: this.params.absolute_path, line: this.params.offset }];
  }

  async execute(): Promise<ToolResult> {
    // First, read the file with standard tool
    const result = await processSingleFileContent(
      this.params.absolute_path,
      this.config.getTargetDir(),
      this.config.getFileSystemService(),
      this.params.offset,
      this.params.limit,
    );

    if (result.error) {
      return {
        llmContent: result.llmContent,
        returnDisplay: result.returnDisplay || 'Error reading file',
        error: {
          message: result.error,
          type: result.errorType,
        },
      };
    }

    let processedContent: PartUnion = result.llmContent || '';

    // Apply optimization strategies if it's a text file
    if (typeof processedContent === 'string') {
      // Apply optimization based on parameters
      if (this.params.essential_only) {
        processedContent = this.extractEssentialContent(processedContent);
      } else if (this.params.search_pattern) {
        processedContent = this.extractContentMatchingPattern(
          processedContent,
          this.params.search_pattern
        );
      }
    }

    // If the content was truncated, provide guidance on how to read more
    if (result.isTruncated) {
      const [start, end] = result.linesShown!;
      const total = result.originalLineCount!;
      const nextOffset = this.params.offset
        ? this.params.offset + end - start + 1
        : end;
      
      processedContent = `\nIMPORTANT: The file content has been optimized/partially read.\nStatus: Showing relevant content from lines ${start}-${end} of ${total} total lines.\nAction: To read more of the file, you can use the 'offset' and 'limit' parameters in a subsequent 'read_file' call. For example, to read the next section of the file, use offset: ${nextOffset}.\n\n--- OPTIMIZED FILE CONTENT ---\n${processedContent}`;
    }

    const lines =
      typeof processedContent === 'string'
        ? processedContent.split('\n').length
        : undefined;
    const mimetype = getSpecificMimeType(this.params.absolute_path);
    const programming_language = getProgrammingLanguage({
      absolute_path: this.params.absolute_path,
    });
    logFileOperation(
      this.config,
      new FileOperationEvent(
        OptimizedReadFileTool.Name,
        FileOperation.READ,
        lines,
        mimetype,
        path.extname(this.params.absolute_path),
        undefined,
        programming_language,
      ),
    );

    return {
      llmContent: processedContent,
      returnDisplay: result.returnDisplay || '',
    };
  }

  /**
   * Extract essential content from the text, such as function definitions, 
   * class declarations, comments with keywords like TODO, etc.
   */
  private extractEssentialContent(content: string): string {
    const lines = content.split('\n');
    const essentialLines: string[] = [];
    const essentialPatterns = [
      // Function and method definitions
      /^\s*(export\s+)?(async\s+)?function\s+\w+/,
      /^\s*(export\s+)?(async\s+)?\w+\s*\(.*\)\s*{/,
      /^\s*.*=>\s*{/,
      /^\s*(export\s+)?class\s+\w+/,
      /^\s*(export\s+)?const\s+\w+\s*=/,
      /^\s*(export\s+)?let\s+\w+\s*=/,
      /^\s*(export\s+)?var\s+\w+\s*=/,
      // Important comments
      /\/\/\s*(TODO|FIXME|NOTE|IMPORTANT|CRITICAL):?/i,
      /\/\*\*?\s*(TODO|FIXME|NOTE|IMPORTANT|CRITICAL):?/i,
      // Export statements
      /^\s*export\s+/,
      /^\s*import\s+/,
      // Variable declarations at root level
      /^\s*(const|let|var)\s+\w+\s*=/
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Include the line if it matches any essential pattern
      if (essentialPatterns.some(pattern => pattern.test(line))) {
        essentialLines.push(lines[i]);
        
        // Also include the next few lines if they're part of the definition
        let lookAhead = 1;
        while (i + lookAhead < lines.length && lookAhead <= 3) {
          const nextLine = lines[i + lookAhead].trim();
          
          // Stop if we hit another essential line or a closing brace
          if (essentialPatterns.some(pattern => pattern.test(nextLine)) || 
              nextLine.startsWith('}') || 
              nextLine.startsWith('*/')) {
            break;
          }
          
          essentialLines.push(lines[i + lookAhead]);
          lookAhead++;
        }
        i += lookAhead - 1; // Skip the lines we already added
      }
    }

    // If we found essential content, return it; otherwise return an informative message
    if (essentialLines.length > 0) {
      return essentialLines.join('\n');
    } else {
      // If no essential content found, return the beginning of the file
      const firstFewLines = lines.slice(0, 10).join('\n');
      return `No specific essential content found in file. Showing first 10 lines:\n${firstFewLines}${lines.length > 10 ? '\n... [content truncated]' : ''}`;
    }
  }

  /**
   * Extract content that matches a specific search pattern
   */
  private extractContentMatchingPattern(content: string, pattern: string): string {
    const lines = content.split('\n');
    const matchingLines: string[] = [];
    
    // Create a regex from the pattern, case-insensitive
    const regex = new RegExp(pattern, 'gi');
    
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        // Include the matching line and context around it
        const startContext = Math.max(0, i - 2);
        const endContext = Math.min(lines.length - 1, i + 2);
        
        for (let j = startContext; j <= endContext; j++) {
          if (!matchingLines.includes(lines[j])) {
            matchingLines.push(lines[j]);
          }
        }
      }
    }

    if (matchingLines.length > 0) {
      return matchingLines.join('\n');
    } else {
      return `No content matching pattern "${pattern}" found in the file.`;
    }
  }
}

/**
 * Implementation of the OptimizedReadFile tool logic
 * This tool reads and returns only essential or relevant parts of a file to reduce payload
 */
export class OptimizedReadFileTool extends BaseDeclarativeTool<
  OptimizedReadFileToolParams,
  ToolResult
> {
  static readonly Name: string = 'optimized_read_file';

  constructor(private config: Config) {
    super(
      OptimizedReadFileTool.Name,
      'OptimizedReadFile',
      `Reads and returns only essential or relevant parts of a specified file to reduce payload to the LLM. For large files, this tool can extract only important sections like function definitions, class declarations, TODO comments, or content matching a search pattern, significantly reducing token usage while preserving critical information. Handles text, images (PNG, JPG, GIF, WEBP, SVG, BMP), and PDF files.`,
      Kind.Read,
      {
        properties: {
          absolute_path: {
            description:
              "The absolute path to the file to read (e.g., '/home/user/project/file.txt'). Relative paths are not supported. You must provide an absolute path.",
            type: 'string',
          },
          offset: {
            description:
              "Optional: For text files, the 0-based line number to start reading from. Requires 'limit' to be set. Use for paginating through large files.",
            type: 'number',
          },
          limit: {
            description:
              "Optional: For text files, maximum number of lines to read. Use with 'offset' to paginate through large files. If omitted, reads the entire file (if feasible, up to a default limit).",
            type: 'number',
          },
          essential_only: {
            description:
              "Optional: If true, reads only essential parts of the file like function/class definitions, important comments (TODO, FIXME, etc.), and export statements.",
            type: 'boolean',
          },
          search_pattern: {
            description:
              "Optional: A pattern (substring or regex) to search for in the file. Only lines matching this pattern and surrounding context will be returned.",
            type: 'string',
          },
        },
        required: ['absolute_path'],
        type: 'object',
      },
    );
  }

  protected override validateToolParamValues(
    params: OptimizedReadFileToolParams,
  ): string | null {
    const filePath = params.absolute_path;
    if (params.absolute_path.trim() === '') {
      return "The 'absolute_path' parameter must be non-empty.";
    }

    if (!path.isAbsolute(filePath)) {
      return `File path must be absolute, but was relative: ${filePath}. You must provide an absolute path.`;
    }

    const workspaceContext = this.config.getWorkspaceContext();
    if (!workspaceContext.isPathWithinWorkspace(filePath)) {
      const directories = workspaceContext.getDirectories();
      return `File path must be within one of the workspace directories: ${directories.join(', ')}`;
    }

    if (params.offset !== undefined && params.offset < 0) {
      return 'Offset must be a non-negative number';
    }
    if (params.limit !== undefined && params.limit <= 0) {
      return 'Limit must be a positive number';
    }

    const fileService = this.config.getFileService();
    if (fileService.shouldGeminiIgnoreFile(params.absolute_path)) {
      return `File path '${filePath}' is ignored by .qwenignore pattern(s).`;
    }

    // Ensure essential_only and search_pattern are not both set
    if (params.essential_only && params.search_pattern) {
      return 'Cannot specify both essential_only and search_pattern at the same time';
    }

    return null;
  }

  protected createInvocation(
    params: OptimizedReadFileToolParams,
  ): ToolInvocation<OptimizedReadFileToolParams, ToolResult> {
    return new OptimizedReadFileToolInvocation(this.config, params);
  }
}