import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const required = process.env.AGENT_API_KEY;
    if (!required) return true; // no key configured -> allow
    const provided = req.headers['x-api-key'] as string | undefined;
    return !!provided && provided === required;
  }
}

