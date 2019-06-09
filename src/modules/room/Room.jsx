import React from 'react';
import Youtube from 'react-youtube';
import axios from 'axios';
import { database } from '../../firebase';

function Room(props) {
  const [roomId, setRoomId] = React.useState('');
  const [userId, setUserId] = React.useState('');
  const [videoId, setVideoId] = React.useState('');
  const [player, setPlayer] = React.useState(null);
  const [query, setQuery] = React.useState('');
  const [state, setState] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(null);

  // set room id
  React.useEffect(() => {
    setRoomId(props.match.params.id);
  }, [props.match.params.id]);

  // set user id
  React.useEffect(() => {
    if (roomId.length) {
      // get available key for a new user
      const userKey = database
        .ref('rooms/' + roomId)
        .child('users')
        .push().key;

      setUserId(userKey);

      database.ref('rooms/' + roomId + '/users/' + userKey).set(true);
    }
  }, [roomId]);

  // get current playing video, if there are no playing video then play one
  React.useEffect(() => {
    if (userId && roomId) {
      database.ref('rooms/' + roomId).on('value', snap => {
        if (snap.child('video').val()) {
          // if video id already exists in room then obtain it
          setVideoId(snap.child('video').val());
        } else if (snap.exists()) {
          // if video id doesn't exist then use this default one
          snap.child('video').ref.set('2Vv-BfVoq4g');
        }
      });
    }
    return () => database.ref('rooms/' + roomId).off('value');
  }, [roomId, userId]);

  // get current playing video, if there are no playing video then play one
  React.useEffect(() => {
    if (player && userId && roomId) {
      database.ref('rooms/' + roomId + '/time').on('value', snap => {
        console.log('ONME');
        if (snap.val() !== player.getCurrentTime()) {
          player.seekTo(snap.val());
        }
      });
      database.ref('rooms/' + roomId + '/state').on('value', snap => {
        if (snap.val() !== state) {
          {
            if (snap.val() === 'paused') {
              player.pauseVideo();
            } else if (snap.val() === 'playing') {
              player.playVideo();
            }
          }
        }
      });
    }
    return () => database.ref('rooms/' + roomId + '/time').off('value');
  }, [player, roomId, state, userId]);

  // leave room when window closes
  // TODO: when user goes back in chrome but doesn't leave the page then it doesn't remove him from the user list
  React.useEffect(() => {
    const handler = () => {
      // handle use leave room event
      database.ref('rooms/' + roomId + '/users/' + userId).remove();
      // if there are no other users - delete the room
      database
        .ref('rooms/' + roomId + '/users')
        .once('value')
        .then(data => {
          if (!data.val()) {
            database.ref('rooms/' + roomId).remove();
          }
        });
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [roomId, userId]);

  function onReady(e) {
    setPlayer(e.target);
    console.log(e);
  }

  function onStateChange(e) {
    let newState = 'unstarted'; // this is when e.data === -1.
    let time = 0;
    if (e.data === 0) {
      newState = 'ended';
    } else if (e.data === 1) {
      newState = 'playing';
    } else if (e.data === 2) {
      newState = 'paused';
    } else if (e.data === 3) {
      newState = 'buffering';
    } else if (e.data === 5) {
      newState = 'video cued';
    }
    setState(newState);
    time = e.target.getCurrentTime();
    console.log(newState, time);
    database
      .ref('rooms/' + roomId + '/time')
      .once('value')
      .then(snap => {
        if (Math.abs(snap.val() - time) > 0.75) {
          database.ref('rooms/' + roomId).update({
            time
          });
        }
      });
    if (newState !== 'buffering') {
      database.ref('rooms/' + roomId).update({
        state: newState
      });
    }
  }

  function Search() {
    axios
      .get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: process.env.REACT_APP_YOUTUBE_API_KEY,
          maxResults: '25',
          part: 'snippet',
          q: query,
          type: 'video'
        }
      })
      .then(res => {
        console.log(res.data);
        setSearchResults(res.data.items);
      });
  }

  function changeVideo(newVideoId) {
    database.ref('rooms/' + roomId + '/video/').set(newVideoId);
  }

  const options = {
    width: '720',
    height: '480',
    // width: '100%',
    // height: '100%',
    playerVars: {
      autoplay: 1
    }
  };

  return (
    <div>
      <h1>Room</h1>
      <Youtube
        opts={options}
        onReady={onReady}
        videoId={videoId}
        onStateChange={onStateChange}
      />
      <div>
        <input type="text" onChange={e => setQuery(e.target.value)} />
        <button onClick={Search}>Search</button>
        {searchResults
          ? searchResults.map(result => (
              <div
                key={result.id.videoId}
                onClick={() => changeVideo(result.id.videoId)}
              >
                <h1>{result.snippet.title}</h1>
              </div>
            ))
          : null}
      </div>
    </div>
  );
}

export default Room;
