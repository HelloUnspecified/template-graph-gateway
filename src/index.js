/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import 'dotenv/config';
import connect from 'connect';
import responseTime from 'response-time';
import uuid from 'uuid/v4';

import apolloServer from './graphql';

const api = connect();

/**
 * http middleware function
 * here we are intercepting the http call and building our own notion of a users context.
 * we then add it to the request so it can later be used by the gateway.
 * If you had something like a token that needs to be passed through to the gateways children this is how you intercept it and setup for later.
 *
 * @param {string} req - http request
 * @param {string} res - http response
 * @param {string} next - next function to execute
 *
 */
const createUserContext = (req, res, next) => {
  req.userContext = {
    locale: req.headers.locale,
    authToken: req.headers.authorization,
    correlationId: req.headers['correlation-id']
      ? req.headers['correlation-id']
      : uuid(),
  };

  next();
};

/**
 * http middleware function that follows adhering to express's middleware.
 * Last item in the middleware chain.
 * This is your api handler for your serverless function
 *
 * @param {string} req - http request
 * @param {string} res - http response
 *
 */
const apiHandler = async (req, res) => {
  const graphServer = apolloServer(req.userContext);

  // todo: set CORS up accordingly
  const graphApi = graphServer.createHandler({
    cors: {
      origin: '*',
      credentials: true,
    },
  });

  try {
    graphApi(req, res);
  } catch (e) {
    res
      .set('Content-Type', 'application/json')
      .status(500)
      .send(new Error(e));
  }
};

/**
 * http middleware function that follows adhering to express's middleware.
 * Last item in the middleware chain.
 * This is your api handler for your serverless function
 *
 */
export const graphEndpoint = api
  .use(responseTime())
  .use(createUserContext)
  .use(apiHandler);
