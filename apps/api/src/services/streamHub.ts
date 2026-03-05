import { Response } from "express";

const clients = new Map<string, Set<Response>>();

const formatEvent = (type: string, data: unknown): string =>
  `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;

export const registerStreamClient = (reviewId: string, res: Response): void => {
  const set = clients.get(reviewId) ?? new Set<Response>();
  set.add(res);
  clients.set(reviewId, set);
};

export const unregisterStreamClient = (reviewId: string, res: Response): void => {
  const set = clients.get(reviewId);
  if (!set) {
    return;
  }
  set.delete(res);
  if (set.size === 0) {
    clients.delete(reviewId);
  }
};

export const emitStreamEvent = (reviewId: string, type: string, data: unknown): void => {
  const set = clients.get(reviewId);
  if (!set) {
    return;
  }

  const payload = formatEvent(type, data);
  for (const client of set) {
    client.write(payload);
  }
};
