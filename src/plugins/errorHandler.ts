import { FastifyError, FastifyPluginAsync } from "fastify";

export const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError, _req, reply) => {
    const status = (error.statusCode as number) || 500;
    const message = status === 400 && error.message ? error.message : error.message || "Internal Server Error";
    reply.code(status).send({ message });
  });
};
