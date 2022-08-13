const Config = {

    //Initial cropping offsets

    INIT_X1: 20,
    INIT_Y1: 20,
    INIT_X2: 80,
    INIT_Y2: 80,

    // Max crop offest (should be in percentage between 1 and 100)

    MAX_CROP: 50,

    // Edge sensitivity

    CROP_EDGE_SENSITIVITY:20,

    // Screen flows

    FLOW_INIT : 0,
    FLOW_IMG_CHOSEN : 1,
    FLOW_CROP : 2,
    FLOW_PREVIEW: 3,
    FLOW_UPLOAD: 4,
    FLOW_SUCESS: 5,
    FLOW_ERROR: 6,
    FLOW_PDF_CHOSEN: 7,
    FLOW_PDF_PREVIEW: 8,
    FLOW_VIDEO_CHOSEN: 9,
    FLOW_VIDEO_PREVIEW: 10,
    FLOW_VIDEO_PROCESSING: 11,

    // Screen sub flows

    FLOW_VIDEO_PREVIEW_INIT : 0,
    FLOW_VIDEO_PREVIEW_THUMBNAIL_VIEW : 1,


    THUMBNAIL_WIDTH: 60,

    
}

export {Config};