import { WorkingMode } from "../dto";
import { DUPLEX_TITLE, PREVIEW_TITLE, STREAMER_TITLE } from "./pageTitles";

export const setPageTitle = (workingMode: WorkingMode) => {
  switch (workingMode) {
    case WorkingMode.Streamer:
      document.title = STREAMER_TITLE;
      break;
    case WorkingMode.Duplex:
    case WorkingMode.Publisher:
      document.title = DUPLEX_TITLE;
      break;
    case WorkingMode.Preview:
      document.title = PREVIEW_TITLE;
      break;
  }
};
