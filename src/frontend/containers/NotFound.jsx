import React from 'react';
import '../assets/styles/containers/NotFound.scss';

const style = {
  color: 'black',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const NotFound = () => (
  <div style={style}>
    <h1>No encontramos la página que buscas :(</h1>
  </div>
);

export default NotFound;
