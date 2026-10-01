import { BadRequestException } from '@nestjs/common';
import { MessageDirection } from './entities/message.entity';

export interface MessageWindow {
  /** Unix epoch milliseconds, inclusive. Selection uses WhatsApp's message time. */
  since?: number;
  /** Unix epoch milliseconds, exclusive. */
  until?: number;
  direction?: MessageDirection;
  /** Exact stored message type (e.g. text, image or voice), no full-text search required. */
  type?: string;
  /** Existing ingestion-time order remains the default. Both orders are newest first. */
  orderBy?: 'createdAt' | 'timestamp';
}

export function validateMessageWindow(window: MessageWindow): void {
  for (const key of ['since', 'until'] as const) {
    const value = window[key];
    if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) {
      throw new BadRequestException(`${key} must be a non-negative, finite Unix epoch millisecond value`);
    }
  }
  if (window.since !== undefined && window.until !== undefined && window.since >= window.until) {
    throw new BadRequestException('since must be earlier than the exclusive until boundary');
  }
  if (window.direction !== undefined && !Object.values(MessageDirection).includes(window.direction)) {
    throw new BadRequestException('direction must be incoming or outgoing');
  }
  if (window.type !== undefined && (typeof window.type !== 'string' || !/^[a-z][a-z0-9_]{0,49}$/.test(window.type))) {
    throw new BadRequestException('type must be a non-empty message type token');
  }
  if (window.orderBy !== undefined && !['createdAt', 'timestamp'].includes(window.orderBy)) {
    throw new BadRequestException('orderBy must be createdAt or timestamp');
  }
}

export function parseMessageWindow(query: {
  since?: string;
  until?: string;
  direction?: string;
  type?: string;
  orderBy?: string;
}): MessageWindow {
  const milliseconds = (key: 'since' | 'until'): number | undefined => {
    const value = query[key];
    if (value === undefined) return undefined;
    // Number('') and Number('0x10') are valid JavaScript, not valid HTTP timestamps.
    if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value))
      throw new BadRequestException(`${key} must be Unix epoch milliseconds`);
    return Number(value);
  };
  const window: MessageWindow = {
    since: milliseconds('since'),
    until: milliseconds('until'),
    direction: query.direction as MessageDirection | undefined,
    type: query.type,
    orderBy: query.orderBy as MessageWindow['orderBy'],
  };
  validateMessageWindow(window);
  return Object.fromEntries(Object.entries(window).filter(([, value]) => value !== undefined));
}
