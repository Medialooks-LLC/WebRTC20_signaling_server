import React, { FC } from "react";
import { Provider } from "react-redux";
import store from "../store";
import { BrowserRouter as Router, Route, RouteComponentProps, Switch } from "react-router-dom";
import { WebRtcContainer } from "../containers/WebRtcContainer";
import { WorkingMode } from "../dto";
import { parseSearchString } from "../helpers";
import { PlayerStart } from "./PlayerStart";
import { StreamerPage } from "./StreamerPage";
import { getPageRoute } from "../helpers/pageRoute";

// eslint-disable-next-line react/display-name
const render = (workingMode: WorkingMode) => ({
  location,
}: RouteComponentProps<{ targetId?: string }>) => {
  const {
    generalSettings,
    localMediaConfig,
    autoJoin,
    guestLogin,
    guestPassword,
    remoteAudioMuted,
    signalingUrl,
  } = parseSearchString(location.search);
  return (
    <WebRtcContainer
      generalSettings={generalSettings}
      targetId={getPageRoute().targetId}
      workingMode={workingMode}
      localMediaConfig={localMediaConfig}
      guestLogin={guestLogin}
      guestPassword={guestPassword}
      autoJoin={autoJoin}
      remoteAudioMuted={remoteAudioMuted}
      signalingUrl={signalingUrl}
    />
  );
};

export const App: FC = () => (
  <Provider store={store}>
    <React.StrictMode>
      <Router>
        <Switch>
          <Route exact path="/streamer" component={StreamerPage} />
          <Route exact path="/player" component={PlayerStart} />
          <Route path="/player/:targetId" render={render(WorkingMode.Preview)} />
          <Route path="/(wg|webguest)/:targetId?" render={render(WorkingMode.Streamer)} />
          <Route path="/(wg2|duplex|webguest2)/:targetId?" render={render(WorkingMode.Duplex)} />
          <Route path="/(pb|publisher)/:targetId?" render={render(WorkingMode.Publisher)} />
          <Route path="/:targetId?" render={render(WorkingMode.Preview)} />
        </Switch>
      </Router>
    </React.StrictMode>
  </Provider>
);
