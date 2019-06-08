import React from 'react';
import { database } from '../../firebase';

function Home(props) {
  function createRoom() {
    const roomKey = database.ref('rooms').push().key;
    console.log('New room key - ', roomKey);
    database
      .ref('rooms')
      .update({
        [roomKey]: {
          name: 'hello'
        }
      })
      .then(() => {
        props.history.push(roomKey);
      });
  }
  return (
    <div>
      <button onClick={createRoom}>Create Room</button>
    </div>
  );
}

export default Home;
