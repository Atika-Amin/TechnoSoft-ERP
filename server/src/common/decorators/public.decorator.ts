import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Put @Public() on a route to skip the login check (e.g. the login route itself)
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
