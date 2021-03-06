import express from 'express';
import dotenv from 'dotenv';
import webpack from 'webpack';
import helmet from 'helmet';
import axios from 'axios';
import passport from 'passport';
import boom from '@hapi/boom';
import cookieParser from 'cookie-parser';
import main from './routes/main';
import {
  logErrors,
  errorHandler
} from './utils/middleware/errorHandlers.js';

dotenv.config();

const ENV = process.env.NODE_ENV;
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(`${__dirname}/public`));

// Basic strategy
require('./utils/auth/strategies/basic');

if (ENV === 'development') {
  console.log('Loading dev config');
  /* eslint-disable global-require */
  const webpackConfig = require('../../webpack.config');
  const webpackDevMiddleware = require('webpack-dev-middleware');
  const webpackHotMiddleware = require('webpack-hot-middleware');
  /* eslint-enable global-require */
  const compiler = webpack(webpackConfig);
  const serverConfig = {
    contentBase: `http://localhost:${PORT}`,
    port: PORT,
    publicPath: webpackConfig.output.publicPath,
    hot: true,
    historyApiFallback: true,
    stats: {
      colors: true,
    },
  };
  app.use(webpackDevMiddleware(compiler, serverConfig));
  app.use(webpackHotMiddleware(compiler));
} else {
  console.log(`Loading ${ENV} config`);
  app.use(helmet());
  app.use(helmet.permittedCrossDomainPolicies());
  app.disable('x-powered-by');
}

app.post('/auth/sign-in', async (req, res, next) => {
  passport.authenticate('basic', async (error, data) => {
    try {
      if (error || !data) {
        return next(boom.unauthorized());
      }
      req.login(data, {
        session: false,
      }, async (error) => {
        if (error) {
          next(error);
        }

        const {
          token,
          ...user
        } = data;

        res.clearCookie('token');
        res.cookie('token', token, {
          httpOnly: ENV !== 'development',
          secure: ENV !== 'development',
          domain: ENV !== 'development' ? 'fgpos.gabrielpinto.me' : ''
        });
        res.status(200).json(user.user);
      });
    } catch (error) {
      next(error);
    }
  })(req, res, next);
});

app.post('/auth/sign-up', async (req, res, next) => {
  const {
    body: user,
  } = req;
  try {
    const userData = await axios({
      url: `${process.env.API_URL}/api/auth/sign-up`,
      method: 'post',
      data: user,
    });
    res.status(201).json({
      name: req.body.name,
      email: req.body.email,
      id: userData.data.data,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/products', async (req, res, next) => {
  const {
    token,
  } = req.cookies;

  axios.get(`${process.env.API_URL}/api/products`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(({
    data,
    status,
  }) => {
    res.status(status).json(data);
  }).catch((err) => {
    next(err);
  });
});

app.get('/api/invoices', async (req, res, next) => {
  const {
    token,
  } = req.cookies;

  axios.get(`${process.env.API_URL}/api/invoices`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(({
    data,
    status,
  }) => {
    res.status(status).json(data);
  }).catch((err) => {
    next(err);
  });
});

app.post('/api/invoices', async (req, res, next) => {

  const {
    cartTotalPrice: totalPrice,
    cartItems,
    creationDate,
  } = req.body;

  const soldProducts = [];

  cartItems.forEach((product) => {
    soldProducts.push({
      id: product.id,
      unitsTotalPrice: product.price,
      soldUnits: product.quantity,
    });
  });

  const {
    token,
  } = req.cookies;

  axios.post(`${process.env.API_URL}/api/invoices`, {
    creationDate,
    totalPrice,
    soldProducts,
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then(({
    data,
    status,
  }) => {
    res.status(status).json(data);
  }).catch((err) => {
    next(err);
  });
});

app.get('*', main);

// Errors middleware
app.use(logErrors);
app.use(errorHandler);

app.listen(PORT, (err) => {
  if (err) console.log(err);
  console.log(`Server running on ${PORT}`);
});