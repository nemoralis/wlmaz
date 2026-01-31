import { config, library } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { faGithub } from "@fortawesome/free-brands-svg-icons";
import { faCopyright, faImage } from "@fortawesome/free-regular-svg-icons";
/* import specific icons */
import {
   faArrowLeft,
   faBan,
   faBars,
   faCamera,
   faChartLine,
   faChartPie,
   faCheck,
   faChevronDown,
   faChevronUp,
   faCircleInfo,
   faCircleNotch,
   faCloudArrowUp,
   faExclamationCircle,
   faExclamationTriangle,
   faExternalLinkAlt,
   faFileSignature,
   faImage as faImageSolid,
   faInfo,
   faInfoCircle,
   faLandmark,
   faLayerGroup,
   faList,
   faLocationArrow,
   faMapLocationDot,
   faMapMarkedAlt,
   faPenToSquare,
   faPlus,
   faSignInAlt,
   faSortNumericDown,
   faSpinner,
   faTrophy,
   faUser,
   faUserCircle,
   faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// Prevent FontAwesome from dynamically adding its CSS since we did it above
config.autoAddCss = false;

/* add icons to the library */
library.add(
   faArrowLeft,
   faBan,
   faBars,
   faCamera,
   faChevronDown,
   faChevronUp,
   faChartLine,
   faChartPie,
   faCheck,
   faCircleInfo,
   faCircleNotch,
   faCloudArrowUp,
   faExclamationCircle,
   faExclamationTriangle,
   faExternalLinkAlt,
   faFileSignature,
   faInfo,
   faInfoCircle,
   faLandmark,
   faLayerGroup,
   faList,
   faLocationArrow,
   faMapLocationDot,
   faMapMarkedAlt,
   faPenToSquare,
   faPlus,
   faSignInAlt,
   faSortNumericDown,
   faSpinner,
   faTrophy,
   faUser,
   faUserCircle,
   faUsers,
   faImageSolid,
   faCopyright,
   faImage,
   faGithub,
);

export { FontAwesomeIcon };
