import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { SignInDto, SignInInput, SignUpInput } from './types';
import { AuthService } from './auth.service';
import { User } from 'src/user/user.schema';
import { GqlContext } from 'src/auth/types/context';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Resolver('Auth')
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => SignInDto)
  async login(
    @Args('signInInput') loginUserDto: SignInInput,
    @Context() ctx: GqlContext,
  ): Promise<SignInDto> {
    const data = await this.authService.signIn(loginUserDto);
    ctx.res.cookie('jwt', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.FRONTEND_DOMAIN,
      maxAge: SEVEN_DAYS_MS,
    });
    return data;
  }

  @Mutation(() => User)
  async register(
    @Args('signUpInput') createUserDto: SignUpInput,
  ): Promise<User> {
    return this.authService.signUp(createUserDto);
  }

  @Mutation(() => Boolean)
  async logout(@Context() ctx: GqlContext): Promise<boolean> {
    ctx.res.clearCookie('jwt', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.FRONTEND_DOMAIN,
    });
    return true;
  }
}
