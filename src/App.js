import React from 'react';
import { Switch, Route } from 'react-router-dom';
import logo from './logo.svg';
import Home from './modules/home/Home';
import Room from './modules/room/Room';
import './App.css';

function App() {
  //React.useEffect(() => {
  // const roomKey = database
  //   .ref()
  //   .child('rooms')
  //   .push().key;
  // console.log(key);
  // database
  //   .ref()
  //   .child('rooms')
  //   .update({
  //     [key]: {
  //       name: 'hello'
  //     }
  //   });
  //}, []);
  return (
    <div className="App">
      <Switch>
        <Route path="/" exact component={Home} />
        <Route path="/:id" exact component={Room} />
      </Switch>
    </div>
  );
}

export default App;
