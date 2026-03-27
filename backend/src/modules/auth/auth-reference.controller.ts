import type { ForgeOpsFastifyInstance } from '../../app/register-routes.js';
import type { OperatorPrincipal } from '../../shared/auth/operator-principal.js';

interface AuthMeReply {
  principal: OperatorPrincipal;
}

export const registerAuthReferenceRoutes = (app: ForgeOpsFastifyInstance): void => {
  app.get<{ Reply: AuthMeReply }>(
    '/api/v1/auth/me',
    {
      config: {
        access: 'protected',
      },
    },
    async (request) => {
      return {
        principal: request.operatorPrincipal!,
      };
    },
  );
};
