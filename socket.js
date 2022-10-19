const socket = require('socket.io');
const { FROM_CLIENT_EVENT, FROM_SERVER_EVENT } = require('./utils/constants');

function initSocketServer(server) {
  const io = socket(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log(
      '================================================================'
    );
    console.log('New connection established from: ' + socket.id);

    function handleSentMouseEvent(data) {
      console.log(data);
      console.log('room name:' + socket.roomName + ', id:' + socket.id);
      io.emit('RECEIVE_MOUSE_EVENT', data);
    }

    function handleSentEnterRoomEvent(roomName) {
      console.log(
        `Client from socket id ${socket.id} is joining room ${roomName}`
      );
      socket.join(roomName);

      socket.roomName = roomName;
      socket.to(roomName).emit('RECEIVE_CALL', { id: socket.id });
    }

    function handleSentLeaveRoomEvent(roomName) {
      console.log(
        `Client from socket id ${socket.id} is leaving room ${roomName}`
      );

      if (socket.roomName) {
        socket.to(socket.roomName).emit('RECEIVE_LEAVE', { id: socket.id });
        socket.leave(socket.roomName);
      }
    }

    function handleSentCallEvent(roomName) {
      console.log(
        `Client from socket id ${socket.id} is calling to room ${roomName}`
      );

      socket.to(socket.roomName).emit('RECEIVE_CALL', { id: socket.id });
    }

    function handleSentCandidateEvent(data) {
      console.log('Room: ', socket.roomName);
      console.log('Candidate from: ' + socket.id);
      console.log('Candidate target: ' + data.target);

      if (data.target) {
        data.ice.id = socket.id;
        socket
          .to(data.target)
          .emit(FROM_SERVER_EVENT.RECEIVE_CANDIDATE, data.ice);
      } else {
        console.log('Candidate need target id');
      }
    }

    function handleSentSdpEvent(data) {
      // console.log(data);
      console.log('SDP: ' + data.sdp.type);
      console.log('SDP from: ' + socket.id);
      console.log('SDP target: ' + data.target);

      data.sdp.id = socket.id;
      if (data.target) {
        socket.to(data.target).emit('RECEIVE_SDP', data.sdp);
      } else {
        socket.broadcast.to(socket.roomName).emit('RECEIVE_SDP', data.sdp);
      }
    }

    function handleSentFullScreenEvent(data) {
      console.log('full screen id: ' + socket.id + ', room:' + socket.roomName);

      data.id = socket.id;
      io.to(socket.roomName).emit('RECEIVE_FULLSCREEN', data);
    }

    function handleEvent({ type, data }) {
      console.log(
        '================================================================'
      );
      console.log('Socket server receive event: ' + type);
      console.log('Handling...');

      switch (type) {
        case FROM_CLIENT_EVENT.SENT_ENTER_ROOM_EVENT:
          handleSentEnterRoomEvent(data);
          break;
        case FROM_CLIENT_EVENT.SENT_LEAVE_ROOM_EVENT:
          handleSentLeaveRoomEvent(data);
          break;
        case FROM_CLIENT_EVENT.SENT_CALL_EVENT:
          handleSentCallEvent(data);
          break;
        case FROM_CLIENT_EVENT.SENT_CANDIDATE:
          handleSentCandidateEvent(data);
          break;
        case FROM_CLIENT_EVENT.SENT_SDP:
          handleSentSdpEvent(data);
          break;
        case FROM_CLIENT_EVENT.SENT_FULLSCREEN_EVENT:
          handleSentFullScreenEvent(data);
          break;
        case FROM_CLIENT_EVENT.SENT_MOUSE_EVENT:
          handleSentMouseEvent(data);
          break;
        default:
          break;
      }
    }

    // Emit event when connection is first established.
    socket.emit(FROM_SERVER_EVENT.RECEIVE_CONNECTED, { id: socket.id });

    // Handling room event callbacks.
    socket.on(FROM_CLIENT_EVENT.SENT_ENTER_ROOM_EVENT, (data) =>
      handleEvent({ type: FROM_CLIENT_EVENT.SENT_ENTER_ROOM_EVENT, data })
    );

    socket.on(FROM_CLIENT_EVENT.SENT_LEAVE_ROOM_EVENT, (data) =>
      handleEvent({ type: FROM_CLIENT_EVENT.SENT_LEAVE_ROOM_EVENT, data })
    );

    // Handling webrtc event callbacks.
    socket.on(FROM_CLIENT_EVENT.SENT_CALL_EVENT, (data) =>
      handleEvent({ type: FROM_CLIENT_EVENT.SENT_CALL_EVENT, data })
    );

    socket.on(FROM_CLIENT_EVENT.SENT_CANDIDATE, (data) =>
      handleEvent({ type: FROM_CLIENT_EVENT.SENT_CANDIDATE, data })
    );

    socket.on(FROM_CLIENT_EVENT.SENT_SDP, (data) =>
      handleEvent({ type: FROM_CLIENT_EVENT.SENT_SDP, data })
    );

    // Handling other event callbacks.
    socket.on(FROM_CLIENT_EVENT.SENT_MOUSE_EVENT, (data) =>
      handleEvent({ type: FROM_CLIENT_EVENT.SENT_MOUSE_EVENT, data })
    );

    socket.on(FROM_CLIENT_EVENT.SENT_FULLSCREEN_EVENT, (data) =>
      handleEvent({ type: FROM_CLIENT_EVENT.SENT_FULLSCREEN_EVENT, data })
    );
  });
}

module.exports = initSocketServer;
