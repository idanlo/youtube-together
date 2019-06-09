import React from 'react';
import Youtube from 'react-youtube';
import axios from 'axios';
import { database } from '../../firebase';

const mapPlayerStateNumberToValue = {
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'video cued'
};

class Room extends React.Component {
  state = {
    roomId: '',
    userId: '',
    videoId: '',
    query: '',
    state: '',
    searchResults: null
  };
  player = null;

  componentDidMount() {
    // add window event listener for leaving the page (leave room)
    window.addEventListener('beforeunload', this.beforeUnloadListener);
    // get room id from url path params
    const roomId = this.props.match.params.id;
    // get available key for a new user in the room
    const userId = database
      .ref('rooms/' + roomId)
      .child('users')
      .push().key;

    // create the user in the database
    database.ref('rooms/' + roomId + '/users/' + userId).set(true);
    // listen to value changes in the room
    database.ref('rooms/' + roomId).on('value', snap => {
      let videoId;

      if (snap.child('video').val()) {
        // if video id already exists in room then obtain it
        videoId = snap.child('video').val();
      } else if (snap.exists()) {
        // if video id doesn't exist then use this default one
        snap.child('video').ref.set('2Vv-BfVoq4g');
        videoId = '2Vv-BfVoq4g';
      }
      this.setState({ videoId });

      if (this.player) {
        if (
          Math.abs(snap.child('time').val() - this.player.getCurrentTime()) >
          0.5
        ) {
          this.player.seekTo(snap.child('time').val());
        }

        const newState = snap.child('state').val();
        if (
          newState !== mapPlayerStateNumberToValue[this.player.getPlayerState]
        ) {
          if (newState === 'paused') {
            this.player.pauseVideo();
          } else if (newState === 'playing') {
            this.player.playVideo();
          }
        }
      }
    });

    this.setState({ roomId, userId });
  }

  componentWillUnmount() {
    // remove window event listener on unmount
    window.removeEventListener('beforeunload', this.beforeUnloadListener);
    // remove event listener for changed values in the room
    database.ref('rooms/' + this.state.roomId).off('value');
  }

  beforeUnloadListener = () => {
    const { userId, roomId } = this.state;
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

  onReady = e => {
    this.player = e.target;
    console.log('Player connected - ', e);
  };

  onStateChange = e => {
    let time = 0;

    let newState = mapPlayerStateNumberToValue[e.data];

    if (!newState) {
      newState = 'unstarted';
    }
    console.log('NEWSTATE', newState);
    time = this.player.getCurrentTime();
    console.log('State changed ', newState, time);
    if (newState !== 'buffering') {
      database.ref('rooms/' + this.state.roomId).update({
        time,
        state: newState
      });
    }
  };

  Search = () => {
    axios
      .get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: process.env.REACT_APP_YOUTUBE_API_KEY,
          maxResults: '25',
          part: 'snippet',
          q: this.state.query,
          type: 'video'
        }
      })
      .then(res => {
        console.log(res.data);
        this.setState({ searchResults: res.data.items });
      });
  };

  changeVideo = newVideoId => {
    database.ref('rooms/' + this.state.roomId + '/video').set(newVideoId);
  };

  render() {
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
          onReady={this.onReady}
          videoId={this.state.videoId}
          onStateChange={this.onStateChange}
        />
        <div>
          <input
            type="text"
            onChange={e => this.setState({ query: e.target.value })}
          />
          <button onClick={this.Search}>Search</button>
          {this.state.searchResults
            ? this.state.searchResults.map(result => (
                <div
                  key={result.id.videoId}
                  onClick={() => this.changeVideo(result.id.videoId)}
                >
                  <h1>{result.snippet.title}</h1>
                </div>
              ))
            : null}
        </div>
      </div>
    );
  }
}

export default Room;
