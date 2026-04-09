import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator customizado para extrair o usuário autenticado da request.
 *
 * Uso no controller:
 *   @Get()
 *   async listar(@CurrentUser() user: { id: string; email: string }) { ... }
 *
 * Isso evita acessar req.user manualmente e deixa o código mais
 * limpo, tipado e testável.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
