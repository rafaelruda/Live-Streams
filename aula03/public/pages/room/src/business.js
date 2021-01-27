class Business {
  constructor({ room, media, view, socketBuilder, peerBuilder }) {
    this.room = room;
    this.media = media;
    this.view = view;

    this.socketBuilder = socketBuilder;
    this.peerBuilder = peerBuilder;

    this.socket = {};
    this.currentStream = {};
    this.currentPeer = {};

    this.peers = new Map();
    this.userRecordings = new Map();
  }

  static initialize(deps) {
    const instance = new Business(deps);
    return instance._init();
  }

  async _init() {
    this.view.configureRecordButton(this.onRecordPressed.bind(this));

    this.currentStream = await this.media.getCamera();

    this.socket = this.socketBuilder.setOnUserConnected(this.onUserConnected()).setOnUserDisconnected(this.onUserDisconnected()).build();

    this.currentPeer = await this.peerBuilder
      .setOnError(this.onPeerError())
      .setOnConnectionOpened(this.onPeerConnectionOpened())
      .setOnCallReceived(this.onPeerCallReceived())
      .setOnPeerStreamReceived(this.onPeerStreamReceived())
      .setOnCallError(this.onPeerCallError())
      .setOnCallClose(this.onPeerCallClose())
      .build();

    this.addVideoStream(this.currentPeer.id);
  }

  addVideoStream(userId, stream = this.currentStream) {
    const recorderInstance = new Recorder(userId, stream);
    this.userRecordings.set(recorderInstance.filename, recorderInstance);
    if (this.recordingEnabled) {
      recorderInstance.startRecording();
    }

    const isCurrentId = false;

    this.view.renderVideo({ userId, stream, isCurrentId });
  }

  onUserDisconnected() {
    return (userId) => {
      console.log("user disconnected!", userId);

      if (this.peers.has(userId)) {
        this.peers.get(userId).call.close();
        this.peers.delete(userId);
      }

      this.view.setParticipants(this.peers.size);
      this.view.removeVideoElement(userId);
    };
  }

  onUserConnected() {
    return (userId) => {
      console.log("user connected!", userId);

      this.currentPeer.call(userId, this.currentStream);
    };
  }

  onPeerError() {
    return (error) => {
      console.error("error on peer!", error);
    };
  }

  onPeerConnectionOpened() {
    return (peer) => {
      const id = peer.id;

      console.log("peer!!", peer);

      this.socket.emit("join-room", this.room, id);
    };
  }

  onPeerCallReceived() {
    return (call) => {
      console.log("answering call", call);

      call.answer(this.currentStream);
    };
  }

  onPeerStreamReceived() {
    return (call, stream) => {
      const calledId = call.peer;

      this.addVideoStream(calledId, stream);

      this.peers.set(calledId, { call });

      this.view.setParticipants(this.peers.size);
    };
  }

  onPeerCallError() {
    return (call, error) => {
      console.log("an call error ocurred!", error);

      this.view.removeVideoElement(call.peer);
    };
  }

  onPeerCallClose() {
    return (call) => {
      console.log("call closed!", call.peer);
    };
  }

  onRecordPressed(recordingEnabled) {
    this.recordingEnabled = recordingEnabled;
    console.log("pressionou", recordingEnabled);
    for (const [key, value] of this.userRecordings) {
      if (this.recordingEnabled) {
        value.startRecording();
        continue;
      }

      this.stopRecording(key);
    }
  }

  // se um usuário entrar e sair da call durante uma gravação
  // precisamos parar as gravações anteriores dele
  async stopRecording(userId) {
    const userRecordings = this.userRecordings;
    for (const [key, value] of userRecordings) {
      const isContextUser = key.includes(userId);

      if (!isContextUser) continue;

      const rec = value;
      const isRecordingActive = rec.recordingActive;

      if (!isRecordingActive) continue;

      await rec.stopRecording();
    }
  }
}
