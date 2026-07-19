import { Request, Response, NextFunction } from 'express';
import { logAudit } from '../services/audit';
import { AuthRequest } from './auth';

const READ_METHODS = new Set(['GET', 'HEAD']);

export function auditMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const originalSend = res.send.bind(res);

  res.send = function (body: any) {
    if (!READ_METHODS.has(req.method) && req.user) {
      const action = `${req.method} ${req.route?.path ?? req.path}`;
      logAudit({
        userId: req.user.id,
        action,
        details: {
          path: req.path,
          method: req.method,
          body: sanitizeBody(req.body),
          statusCode: res.statusCode,
          response: typeof body === 'string' ? body.slice(0, 500) : undefined,
        },
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
    }
    return originalSend(body);
  };

  next();
}

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  ['password', 'signature', 'token', 'jwtSecret'].forEach((key) => {
    if (key in sanitized) sanitized[key] = '***';
  });
  return sanitized;
}

export function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.ip || undefined;
}
