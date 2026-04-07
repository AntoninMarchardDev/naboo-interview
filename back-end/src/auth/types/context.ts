import { Request, Response } from 'express';
import { PayloadDto } from './jwtPayload.dto';

export interface GqlContext {
  req: Request;
  res: Response;
  jwtPayload: PayloadDto | null;
}

export interface ContextWithJWTPayload extends GqlContext {
  jwtPayload: PayloadDto;
}
