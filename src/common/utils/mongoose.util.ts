import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';

export function assertValidObjectId(id: string, field = 'id'): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestException(`${field} must be a valid MongoId`);
  }
}

export function handleDuplicateKeyError(error: unknown): void {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: number }).code === 11000
  ) {
    throw new ConflictException('A record with the same unique fields already exists');
  }
}
