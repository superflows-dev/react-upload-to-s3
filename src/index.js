import React, { useEffect } from 'react'
import {useState, useRef} from 'react'
import { Col, Row, Container, Button } from 'react-bootstrap';
import { CloudArrowUp, Check2Circle, ExclamationCircle, FilePdf, FileEarmarkPlay, Scissors, BoxArrowLeft, BoxArrowRight, CameraFill, Eye } from 'react-bootstrap-icons';
import * as Icons from 'react-bootstrap-icons';
import { ButtonNeutral, ButtonNext } from 'react-ui-components-superflows';
import Themes from 'react-ui-themes-superflows'

import {Config} from './config';
import { Constants } from './constants';

import * as AWS from 'aws-sdk'
import * as MediaConvert from "aws-sdk/clients/mediaconvert";

import { ConfigurationOptions } from 'aws-sdk'


function updateAWSConfigAndGetClient(region, secret, key, endpoint) {

  const configuration: ConfigurationOptions = {
    region: region,
    secretAccessKey: secret,
    accessKeyId: key
  }

  AWS.config.update(configuration)
  AWS.config.mediaconvert = {endpoint : endpoint};
  return new AWS.DynamoDB.DocumentClient();

}

function getMyBucket(bucket, region) {
  const myBucket = new AWS.S3({
    params: { Bucket: bucket},
    region: region,
  })
  //console.logg(myBucket);

  return myBucket;
}

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height
  };
}

export const UploadToS3 = (props) => {

  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [progress , setProgress] = useState(0);
  const [flow, setFlow] = useState(Config.FLOW_INIT)
  const [subFlow, setSubFlow] = useState(Config.FLOW_VIDEO_PREVIEW_INIT)
  const [moveX, setMoveX] = useState(0);
  const [moveY, setMoveY] = useState(0)
  const [tsX, setTsX] = useState(0);
  const [tsY, setTsY] = useState(0);
  const [teX, setTeX] = useState(0);
  const [teY, setTeY] = useState(0);
  const [cropInitX1, setCropInitX1] = useState(Config.INIT_X1);
  const [cropInitY1, setCropInitY1] = useState(Config.INIT_Y1);
  const [cropInitX2, setCropInitX2] = useState(Config.INIT_X2);
  const [cropInitY2, setCropInitY2] = useState(Config.INIT_Y2);
  const [fileType, setFileType] = useState('')
  const [jobStatus, setJobStatus] = useState('')
  const [ext, setExt] = useState('')
  const [src, setSrc] = useState('')
  const [srcThumbnail, setSrcThumbnail] = useState('')
  const [videoName, setVideoName] = useState(null);
  const [videoDuration, setVideoDuration] = useState(null);
  const [videoSize, setVideoSize] = useState(null);
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(null);
  const [videoStartPosition, setVideoStartPosition] = useState(null);
  const [videoEndPosition, setVideoEndPosition] = useState(null);
  const [pdfName, setPdfName] = useState('')
  const [pdfSize, setPdfSize] = useState('')
  const [disableMarkStart, setDisableMarkStart] = useState(false);
  const [disableMarkEnd, setDisableMarkEnd] = useState(false);

  const { [props.icon]: Icon } = Icons
  const refInputImage = useRef(null);
  const refInputPdf = useRef(null);
  const refInputVideo= useRef(null);
  const refInputVideoPreview= useRef(null);
  const refCanvas = useRef(null);
  const refCanvasOverlay = useRef(null);
  const refCanvasContainer = useRef(null);
  const refCanvasThumbnail = useRef(null);

  const defaultTheme = Themes.getTheme('Default');

  updateAWSConfigAndGetClient(props.awsRegion, props.awsSecret, props.awsKey, props.awsMediaConvertEndPoint);

  function dataURItoBlob(dataURI) {
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
  }

  function onUploadClick() {
    uploadFile(ext)
    setFlowWrap(Config.FLOW_UPLOAD);
  }

  function onNewUploadClick() {
    setFlowWrap(Config.FLOW_INIT);
  }

  function setFlowWrap(value) {
    setTimeout(() => { setFlow(value);}, 500);
  }

  function setSubFlowWrap(value) {
    setTimeout(() => { setSubFlow(value);}, 500);
  }

  function setProgressWrap(value) {
    setTimeout(() => { setProgress(value);}, 100);
  }

  function onPreviewClicked() {

    if(flow === Config.FLOW_CROP) {
      setFlowWrap(Config.FLOW_PREVIEW);
    }

    //console.logg('flow', flow);

    if(flow === Config.FLOW_PDF_CHOSEN) {
      setFlowWrap(Config.FLOW_PDF_PREVIEW);
    }

    if(flow === Config.FLOW_VIDEO_CHOSEN) {
      setFlowWrap(Config.FLOW_VIDEO_PREVIEW);
    }

  }

  function onCancelClicked() {

    //console.logg('on cancel', flow);

    if(flow === Config.FLOW_IMG_CHOSEN || flow === Config.FLOW_PDF_CHOSEN || flow == Config.FLOW_VIDEO_CHOSEN) {
      setFlowWrap(Config.FLOW_INIT)
      clearInputs();
    }

    if(flow === Config.FLOW_CROP) {
      setFlowWrap(Config.FLOW_IMG_CHOSEN);
    }

    if(flow === Config.FLOW_PREVIEW) {
      setFlowWrap(Config.FLOW_CROP);
    }

    if(flow === Config.FLOW_PDF_PREVIEW) {
      setFlowWrap(Config.FLOW_PDF_CHOSEN);
    }

    if(flow === Config.FLOW_VIDEO_PREVIEW) {
      setFlowWrap(Config.FLOW_VIDEO_CHOSEN);
    }

  }

  function onCropClicked() {
    if(flow === Config.FLOW_IMG_CHOSEN) {
      setFlowWrap(Config.FLOW_CROP);
    }
  }

  function onTimeUpdate() {
    //console.logg('currentime', refInputVideoPreview.current.currentTime);
    setVideoCurrentTime(parseInt(refInputVideoPreview.current.currentTime));

    setDisableMarkStart(false);
    setDisableMarkEnd(false);

    if(parseInt(videoStartPosition) > 0 || parseInt(videoEndPosition)) {
      if(parseInt(videoStartPosition) > 0) {
        if(parseInt(refInputVideoPreview.current.currentTime) < parseInt(videoStartPosition)) {
          setDisableMarkEnd(true);
        }
      }
      if(parseInt(videoEndPosition) > 0) {
        if(parseInt(refInputVideoPreview.current.currentTime) > parseInt(videoEndPosition)) {
          setDisableMarkStart(true);
        }
      }
    }

  }

  function onMarkStartPosition() {
    setVideoStartPosition(parseInt(videoCurrentTime));
  }

  function onMarkEndPosition() {
    setVideoEndPosition(parseInt(videoCurrentTime));
  }

  function gotoStartPosition() {
    refInputVideoPreview.current.currentTime = videoStartPosition
  }

  function gotoEndPosition() {
    refInputVideoPreview.current.currentTime = videoEndPosition
  }

  async function deleteOriginal(s3Input) {

    //console.logg(s3Input);
    //console.logg(props.bucket);
    //console.logg("s3://" + props.bucket);
    //console.logg(s3Input.replace(props.bucket + "/", ""));

    const fileName = s3Input.replace(props.bucket + "/", "").split(".")[0] + "." + ext;

    const params = {
        Bucket: props.bucket,
        Key: fileName,
    };

    //console.logg(params);

    var deletePromise = getMyBucket(props.bucket, props.awsRegion).deleteObject(params).promise();
    deletePromise.then(function(data) {
      //console.logg('delete result', data);
    });
    
  }

  function uploadThumbnail(url) {
    let blob = null;
    blob = dataURItoBlob(srcThumbnail);
    const fileName = props.type + "_" + (new Date().getTime()) + ".jpg";

    const params = {
        ACL: 'public-read',
        Body: blob,
        Bucket: props.bucket,
        Key: fileName,
        ContentType: fileType
    };

    getMyBucket(props.bucket, props.awsRegion).putObject(params)
      .on('httpUploadProgress', (evt) => {

        const progressVal = Math.round((evt.loaded / evt.total) * 100);
        //console.logg('progress', progressVal);
        setProgressWrap(progressVal)

        if(progressVal === 100) {
          setFlowWrap(Config.FLOW_SUCESS);
          props.onResult({result: true, url: url, thumbnail: props.bucket + "/" + fileName})
        }

      })
      .send((err) => {
          if (err) {
            if(props.onResult != null) {
              props.onResult(
                {result: false, error: err}
              )
              setFlowWrap(Config.FLOW_ERROR);
            }
          }
      })
  }

  async function getJobStatus(jobId, s3Input) {

    var jobStatusPromise = new AWS.MediaConvert({apiVersion: '2017-08-29'}).getJob({Id: jobId}).promise();
    jobStatusPromise.then(
      function(data) {
        setJobStatus(data.Job?.Status);
        if(data.Job?.Status == Constants.JOB_STATUS_SUBMITTED) {
          checkJobStatus(jobId, s3Input);
        } else if(data.Job?.Status == Constants.JOB_STATUS_COMPLETE) {
          deleteOriginal(s3Input);
          if(props.onResult != null) {
            
            const url = s3Input.replace("s3://", "").split(".")[0] + data.Job?.Settings.OutputGroups[0].CustomName + "." + ext;
            uploadThumbnail(url);
            
          }
          setFlowWrap(Config.FLOW_SUCESS);
        }
      },
      function(err) {
        //console.logg("Error", err);
      }
    );

  }

  function checkJobStatus(jobId, s3Input) {

    //console.logg('checking status');

    setTimeout(() => {
      
      //console.logg('getting status', s3Input);
      getJobStatus(jobId, s3Input)
      
    }, 10000);

  }

  async function createMediaConvertJob(s3Input) {

    const jobTemplate = {
      "Role": "arn:aws:iam::181895849565:role/" + props.mediaConvertRole,
      "Settings": {
        "Inputs": [
          {
            "TimecodeSource": "ZEROBASED",
            "VideoSelector": {},
            "AudioSelectors": {
              "Audio Selector 1": {
                "DefaultSelection": "DEFAULT"
              }
            },
            "FileInput": "s3://" + s3Input,
            "InputClippings": [
              {
                "StartTimecode": (videoStartPosition > 0 && videoStartPosition != null) ? new Date(videoStartPosition * 1000).toISOString().substring(11, 19) + ":00" : "00:00:00:00",
                "EndTimecode": (videoEndPosition > 0 && videoEndPosition != null) ? new Date(videoEndPosition * 1000).toISOString().substring(11, 19) + ":00" : new Date(videoDuration * 1000).toISOString().substring(11, 19) + ":00",
              }
            ]
          }
        ],
        "OutputGroups": [
          {
            "Name": "File Group",
            "OutputGroupSettings": {
              "Type": "FILE_GROUP_SETTINGS",
              "FileGroupSettings": {
                "Destination": "s3://" + props.bucket + "/"
              }
            },
            "Outputs": [
              {
                "VideoDescription": {
                  "CodecSettings": {
                    "Codec": "H_264",
                    "H264Settings": {
                      "RateControlMode": "QVBR",
                      "SceneChangeDetect": "TRANSITION_DETECTION",
                      "MaxBitrate": 10000000,
                    }
                  }
                },
                "AudioDescriptions": [
                  {
                    "CodecSettings": {
                      "Codec": "AAC",
                      "AacSettings": {
                        "Bitrate": 96000,
                        "CodingMode": "CODING_MODE_2_0",
                        "SampleRate": 48000
                      }
                    }
                  }
                ],
                "ContainerSettings": {
                  "Container": "MP4",
                  "Mp4Settings": {}
                },
                "NameModifier": "output1"
              }
            ],
            "CustomName": "output1"
          }
        ],
        "TimecodeConfig": {
          "Source": "ZEROBASED"
        }
      }
    };

    var endpointPromise = new AWS.MediaConvert({apiVersion: '2017-08-29'}).createJob(jobTemplate).promise();

    // Handle promise's fulfilled/rejected status
    endpointPromise.then(
      function(data) {
        //console.logg("Job created! ", data.Job?.Id, Constants.JOB_STATUS_SUBMITTED);
        setJobStatus(Constants.JOB_STATUS_SUBMITTED);
        checkJobStatus(data.Job?.Id, s3Input);
        setFlowWrap(Config.FLOW_VIDEO_PROCESSING)
      },
      function(err) {
        //console.logg("Error", err);
      }
    );
  }

  const uploadFile = (ext) => {

    let blob = null;

    if(flow === Config.FLOW_CROP || flow === Config.FLOW_PREVIEW) {
      const canvasTemp = refCanvas.current;
      blob = dataURItoBlob(canvasTemp.toDataURL(fileType));
    } else if(flow === Config.FLOW_IMG_CHOSEN || flow === Config.FLOW_PDF_CHOSEN || flow == Config.FLOW_PDF_PREVIEW || flow == Config.FLOW_VIDEO_CHOSEN || flow == Config.FLOW_VIDEO_PREVIEW) {
      blob = dataURItoBlob(src);
    }

    const fileName = props.type + "_" + (new Date().getTime()) + "." + ext;

    const params = {
        ACL: 'public-read',
        Body: blob,
        Bucket: props.bucket,
        Key: fileName,
        ContentType: fileType
    };

    console.log('upload file', fileName);

    getMyBucket(props.bucket, props.awsRegion).putObject(params)
      .on('httpUploadProgress', (evt) => {

        const progressVal = Math.round((evt.loaded / evt.total) * 100);
        //console.logg('progress', progressVal);
        setProgressWrap(progressVal)

        if(progressVal === 100) {

          if(props.type == Constants.TYPE_VIDEO) {
            if((videoStartPosition != null && videoStartPosition > 0) 
            || (videoEndPosition != null && videoEndPosition > 0)) {
              setFlowWrap(Config.FLOW_VIDEO_PROCESSING)
              createMediaConvertJob(props.bucket + "/" + fileName)
            } else {
              uploadThumbnail(props.bucket + "/" + fileName);
            }
            clearInputs();
          } else {
            if(props.onResult != null) {
              props.onResult(
                {result: true, url: props.bucket + "/" + fileName}
              )
            }
            setFlowWrap(Config.FLOW_SUCESS);
            clearInputs();
          }
          
        }

      })
      .send((err) => {
          if (err) {
            if(props.onResult != null) {
              props.onResult(
                {result: false, error: err}
              )
              setFlowWrap(Config.FLOW_ERROR);
            }
          }
      })
  }

  function openDialog () {

    //console.logg('props', props.type);

    if(props.type == Constants.TYPE_IMAGE) {

      if(flow === Config.FLOW_INIT) {
        refInputImage.current.click();
      }

    } else if(props.type == Constants.TYPE_PDF) {

      if(flow === Config.FLOW_INIT) {
        refInputPdf.current.click();
      }

    } else {

      if(flow === Config.FLOW_INIT) {
        refInputVideo.current.click();
      }

    }

  }

  function onFileSelectionChanged(event) {

    if(props.type == Constants.TYPE_IMAGE) {

      const [file] = refInputImage.current.files
      //console.logg(file);
      if (file) {
        var reader = new FileReader();
        reader.onload = function(){
  
          var fileName = file.name;
          var strArr = fileName.split(".");
          setExt(strArr[strArr.length - 1]);
          setFileType(file.type)
  
          var output = document.getElementById('output');
          setSrc(reader.result);
          setFlowWrap(Config.FLOW_IMG_CHOSEN);
        };
        reader.readAsDataURL(file);
      }

    } else if(props.type == Constants.TYPE_PDF) {

      const [file] = refInputPdf.current.files
      if(file) {
        //setPdf(file);
        setPdfName(file.name);
        setPdfSize((file.size / 1024) + 'KB')
        setFlowWrap(Config.FLOW_PDF_CHOSEN);

        var reader = new FileReader();
        reader.onload = function(){
  
          //console.logg(file);
          var fileName = file.name;
          var strArr = fileName.split(".");
          setExt(strArr[strArr.length - 1]);
          setFileType(file.type)
          setSrc(reader.result);
          //console.logg(reader.result);
          
        };
        reader.readAsDataURL(file);

      }

    } else {

      const [file] = refInputVideo.current.files
      console.log(file);

      if(file) {
        var reader = new FileReader();
        reader.onload = function(){
  
          var fileName = file.name;
          var strArr = fileName.split(".");
          setVideoName(file.name);
          setVideoSize((file.size / 1024) + 'KB')
          setExt(strArr[strArr.length - 1]);
          setFileType(file.type)
          setSrc(reader.result); 
          setFlowWrap(Config.FLOW_VIDEO_CHOSEN);
          
        };
        reader.readAsDataURL(file);
      }

      if(file) {
        var video = document.createElement('video');
        video.preload = 'metadata';

        video.onloadedmetadata = function() {

          var duration = video.duration;
          setVideoDuration(parseInt(duration));
          setVideoWidth(parseInt(video.videoWidth));
          setVideoHeight(parseInt(video.videoHeight));
        }
        video.src = URL.createObjectURL(file);
        video.load();
      }

    }

  }

  function showThumbnail(value) {
    if(value) {
      setSubFlowWrap(Config.FLOW_VIDEO_PREVIEW_THUMBNAIL_VIEW);
    } else {
      setSubFlowWrap(Config.FLOW_VIDEO_PREVIEW_INIT);
    }
  }

  function captureThumbnail() {
    const canvasScreenWidth = 100;
    const canvasScreenHeight = (canvasScreenWidth*videoHeight) / videoWidth;

    const ctxTemp = refCanvasThumbnail.current.getContext('2d');

    console.log('screen Height', canvasScreenHeight);

    refCanvasThumbnail.current.style.height = canvasScreenHeight;
    refCanvasThumbnail.current.width = videoWidth;
    refCanvasThumbnail.current.height = videoHeight;

    ctxTemp.imageSmoothingEnabled = false;
    ctxTemp.drawImage(
      refInputVideoPreview.current, 
      0, 
      0, 
      videoWidth, 
      videoHeight);

    setSrcThumbnail(refCanvasThumbnail.current.toDataURL('image/jpeg'));
  }

  useEffect(() => {

    if(flow === Config.FLOW_VIDEO_PREVIEW && subFlow === Config.FLOW_VIDEO_PREVIEW_THUMBNAIL_VIEW) {



    }

  }, [subFlow])

  // Draws the video thumbnail on canvas

  useEffect(() => {

    if(flow === Config.FLOW_VIDEO_PREVIEW && videoWidth > 0 && videoHeight > 0) {

      refInputVideoPreview.current.addEventListener('play', (event) => {

        captureThumbnail();

      })
    }

  }, [flow, videoWidth, videoHeight])


  // Draws the cropped area

  useEffect(() => {

    if(flow === Config.FLOW_CROP) {

      var image = new Image();
      image.src = src;
      image.onload = function(){

        const imageW = image.width;
        const imageH = image.height;

        const canvasTemp = refCanvas.current;
        const ctxTemp = canvasTemp.getContext('2d');

        const sx1 = parseInt((cropInitX1*image.width)/100);
        const sy1 = parseInt((cropInitY1*image.height)/100);

        const sx2 = parseInt((cropInitX2*image.width)/100);
        const sy2 = parseInt((cropInitY2*image.height)/100);

        //console.logg('sx sy', sx1, sy1, sx2, sy2);

        const sw = sx2 - sx1;
        const sh = sy2 - sy1;

        canvasTemp.width = sw;
        canvasTemp.height = sh;

        //console.logg('sw sh', sw, sh, (sw/sh));

        const dx = 0;
        const dy = 0;

        const dw = canvasTemp.width;
        const dh = canvasTemp.height;

        //console.logg('dw dh', dw, dh, (dw/dh));

        ctxTemp.imageSmoothingEnabled = false;
        ctxTemp.drawImage(
          image, 
          sx1, 
          sy1, 
          sw, 
          sh, 
          dx, 
          dy,
          dw,
          dh);

      }
      
    }

  }, [flow, src, cropInitX1, cropInitX2, cropInitY1, cropInitY2])

  // Shows the drag point during cropping

  useEffect(() => {

    if(flow === Config.FLOW_CROP && moveX > 0  && moveY > 0) {

      const canvas = refCanvasOverlay.current;
      const ctx = canvas.getContext('2d');

      const containerW = refCanvasContainer.current.clientWidth;
      const containerH = refCanvasContainer.current.clientHeight;

      canvas.width = containerW;
      canvas.height = containerH;

      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([3, 5]);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(moveX, 0);
      ctx.lineTo(moveX, containerH);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, moveY);
      ctx.lineTo(containerW, moveY);

      ctx.stroke();

    } else {

      const canvas = refCanvasOverlay.current;
      if(canvas != null) {
      
        const ctx = canvas.getContext('2d');

        const containerW = refCanvasContainer.current.clientWidth;
        const containerH = refCanvasContainer.current.clientHeight;

        canvas.width = containerW;
        canvas.height = containerH;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

      }

    }

  }, [moveX, moveY])

  // Moves the edges of the cropped area after drag

  useEffect(() => {

    //console.logg('useeffect', flow, teX, teY)
    
    if(flow === Config.FLOW_CROP && teX > 0 && teY > 0) {
      guessMovement();
      setTeX(0);
      setTeY(0);
      setTsX(0);
      setTsY(0);  
    }

  }, [teX, teY])

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }

  window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mouse Events

  function onMouseMove(event) {

    //console.logg('mouesmove', event.type);

    if(event.type == 'mousemove') {

      if(flow === Config.FLOW_CROP && tsX > 0 && tsY > 0) {
        var rect = event.target.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;
        setMoveX(parseInt(x))
        setMoveY(parseInt(y))
      }

    }  else {

      if(flow === Config.FLOW_CROP) {
        var rect = event.target.getBoundingClientRect();
        var x = event.changedTouches[0].clientX - rect.left;
        var y = event.changedTouches[0].clientY - rect.top;
        setMoveX(parseInt(x))
        setMoveY(parseInt(y))
      }

    }
  }

  function onMouseDown(event) {

    //console.logg(event.type);

    if(event.type == 'mousedown') {
      if(flow === Config.FLOW_CROP) {
        var rect = event.target.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;


        //console.logg(event.clientX, event.clientY);
        //console.logg(event.screenX, event.screenY);
        //console.logg(rect.left, rect.top);


        setTsX(parseInt(x))
        setTsY(parseInt(y))
      }
    } else {
      if(flow === Config.FLOW_CROP) {
        var rect = event.target.getBoundingClientRect();
        var x = event.touches[0].clientX - rect.left;
        var y = event.touches[0].clientY - rect.top;
        setTsX(parseInt(x))
        setTsY(parseInt(y))
      }
    }

    
  }

  function onMouseUp(event) {

    //console.logg('mouseUp', event.type)

    if(event.type == 'mouseup') {

      if(flow === Config.FLOW_CROP) {
        
        var rect = event.target.getBoundingClientRect();
        var x = event.clientX - rect.left;
        var y = event.clientY - rect.top;

        //console.logg(event.clientX, event.clientY);
        //console.logg(event.screenX, event.screenY);
        //console.logg(rect.left, rect.top);

        
        setTeX(parseInt(x))
        setTeY(parseInt(y))
        setMoveX(0)
        setMoveY(0)
      }

    } else {

      if(flow === Config.FLOW_CROP) {
        var rect = event.target.getBoundingClientRect();
        var x = event.changedTouches[0].clientX - rect.left;
        var y = event.changedTouches[0].clientY - rect.top;
        setTeX(parseInt(x))
        setTeY(parseInt(y))
        setMoveX(0)
        setMoveY(0)
      }

    }

  }

  // Code to move the edges

  function moveLeft(edge, percent) {
    edge == 'L' ? setCropInitX1(cropInitX1 - percent > 0 ? cropInitX1 - percent : cropInitX1) : setCropInitX2(cropInitX2 - percent > Config.MAX_CROP ? cropInitX2 - percent : cropInitX2)
  }

  function moveRight(edge,percent) {
    edge == 'L' ? setCropInitX1(cropInitX1 + percent < Config.MAX_CROP ? cropInitX1 + percent : cropInitX1) : setCropInitX2(cropInitX2 + percent < 100 ? cropInitX2 + percent : cropInitX2)
  }

  function moveAbove(edge,percent) {
    edge == 'T' ? setCropInitY1(cropInitY1 - percent > 0 ? cropInitY1 - percent : cropInitY1) : setCropInitY2(cropInitY2 - percent > Config.MAX_CROP ? cropInitY2 - percent : cropInitY2)
  }

  function moveBelow(edge,percent) {
    edge == 'T' ? setCropInitY1(cropInitY1 + percent < (100 - Config.MAX_CROP) ? cropInitY1 + percent : cropInitY1) : setCropInitY2(cropInitY2 + percent < 100 ? cropInitY2 + percent : cropInitY2)
  }

  
  //Calculates the actual movement as a result of drag

  function guessMovement() {

    // Guess the direction

    var axis = "";
    var direction = "";

    const movementX = (teX - tsX);
    const movementY = (teY - tsY);

    const absMovementX = Math.abs(teX - tsX);
    const absMovementY = Math.abs(teY - tsY);

    if(absMovementX > absMovementY) {
      axis = 'H'
      if(movementX < 0) {
        direction = 'L'
      } else  {
        direction = 'R';
      }
    } else {
      axis = 'V'
      if(movementY < 0) {
        direction = 'T'
      } else  {
        direction = 'B';
      }
    }
    // Guess the part of view on which interaction started

    const canvasW = refCanvas.current.clientWidth;
    const canvasH = refCanvas.current.clientHeight;

    const containerW = refCanvasContainer.current.clientWidth;
    const containerH = refCanvasContainer.current.clientHeight;

    if(((Math.abs(tsX - (cropInitX1*containerW)/100) * 100)/canvasW) < Config.CROP_EDGE_SENSITIVITY && ((Math.abs(tsY - (cropInitY1*containerH)/100) * 100)/canvasH) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('TL', axis, direction);
      if(axis == 'H' && direction == "L") moveLeft('L', (absMovementX*100)/containerW)
      if(axis == 'H' && direction == "R") moveRight('L', (absMovementX*100)/containerW)
      if(axis == 'V' && direction == "T") moveAbove('T', (absMovementY*100)/containerW)
      if(axis == 'V' && direction == "B") moveBelow('T', (absMovementY*100)/containerW)
    } else if(((Math.abs(tsX - (cropInitX1*containerW)/100) * 100)/canvasW) < Config.CROP_EDGE_SENSITIVITY && ((Math.abs(tsY - (cropInitY2*containerH)/100) * 100)/canvasH) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('BL', axis, direction);
      if(axis == 'H' && direction == "L") moveLeft('L', (absMovementX*100)/containerW)
      if(axis == 'H' && direction == "R") moveRight('L', (absMovementX*100)/containerW)
      if(axis == 'V' && direction == "T") moveAbove('B', (absMovementY*100)/containerW)
      if(axis == 'V' && direction == "B") moveBelow('B', (absMovementY*100)/containerW)
    } else if(((Math.abs(tsX - (cropInitX2*containerW)/100) * 100)/canvasW) < Config.CROP_EDGE_SENSITIVITY && ((Math.abs(tsY - (cropInitY2*containerH)/100) * 100)/canvasH) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('BR', axis, direction);
      if(axis == 'H' && direction == "L") moveLeft('R', (absMovementX*100)/containerW)
      if(axis == 'H' && direction == "R") moveRight('R', (absMovementX*100)/containerW)
      if(axis == 'V' && direction == "T") moveAbove('B', (absMovementY*100)/containerW)
      if(axis == 'V' && direction == "B") moveBelow('B', (absMovementY*100)/containerW)
    } else if(((Math.abs(tsX - (cropInitX2*containerW)/100) * 100)/canvasW) < Config.CROP_EDGE_SENSITIVITY && ((Math.abs(tsY - (cropInitY1*containerH)/100) * 100)/canvasH) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('TR', axis, direction);
      if(axis == 'H' && direction == "L") moveLeft('R', (absMovementX*100)/containerW)
      if(axis == 'H' && direction == "R") moveRight('R', (absMovementX*100)/containerW)
      if(axis == 'V' && direction == "T") moveAbove('T', (absMovementY*100)/containerW)
      if(axis == 'V' && direction == "B") moveBelow('T', (absMovementY*100)/containerW)
    } else if(((Math.abs(tsX - (cropInitX1*containerW)/100) * 100)/canvasW) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('LE', axis, direction);
      if(axis == 'H' && direction == "L") moveLeft('L', (absMovementX*100)/containerW)
      if(axis == 'H' && direction == "R") moveRight('L', (absMovementX*100)/containerW)
    } else if(((Math.abs(tsX - (cropInitX2*containerW)/100) * 100)/canvasW) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('RE', axis, direction);
      if(axis == 'H' && direction == "L") moveLeft('R', (absMovementX*100)/containerW)
      if(axis == 'H' && direction == "R") moveRight('R', (absMovementX*100)/containerW)
    } else if(((Math.abs(tsY - (cropInitY1*containerH)/100) * 100)/canvasH) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('TE', axis, direction);
      if(axis == 'V' && direction == "T") moveAbove('T', (absMovementY*100)/containerW)
      if(axis == 'V' && direction == "B") moveBelow('T', (absMovementY*100)/containerW)
    } else if(((Math.abs(tsY - (cropInitY2*containerH)/100) * 100)/canvasH) < Config.CROP_EDGE_SENSITIVITY) {
      //console.logg('BE', axis, direction);
      if(axis == 'V' && direction == "T") moveAbove('B', (absMovementY*100)/containerW)
      if(axis == 'V' && direction == "B") moveBelow('B', (absMovementY*100)/containerW)
    } else {
      //console.logg('CE', axis, direction);
      if(axis == 'H' && direction == "L") {
        moveLeft('L', (absMovementX*100)/containerW)
        moveLeft('R', (absMovementX*100)/containerW)
      } else if (axis == 'H' && direction == "R") {
        moveRight('L', (absMovementX*100)/containerW)
        moveRight('R', (absMovementX*100)/containerW)
      } else if(axis == 'V' && direction == "T") {
        moveAbove('T', (absMovementY*100)/containerW)
        moveAbove('B', (absMovementY*100)/containerW)
      } else {
        moveBelow('T', (absMovementY*100)/containerW)
        moveBelow('B', (absMovementY*100)/containerW)
      }
    }

  }

  function clearInputs() {

    refInputVideo.current.value = '';
    refInputImage.current.value = '';
    refInputPdf.current.value = '';

  }

  return (
    <Container onClick={openDialog} className="w-100 rounded-3 pb-3"
      style={{
        background: flow === Config.FLOW_UPLOAD ? 'linear-gradient(to right, #d6f5d6, #d6f5d6 '+progress+'%, white '+progress+'%, white '+(100 - progress)+'%)' : flow === Config.FLOW_SUCESS ? '#d6f5d6' : flow === Config.FLOW_ERROR ? '#FFCCCC' :  props.theme != null ? props.theme.uploadToS3BackgroundColor : defaultTheme.uploadToS3BackgroundColor
      }}
    >
      <Row className='justify-content-center'>
        <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex align-items-center px-3 pt-2 pb-1`} >
          <div 
            className='me-3'
            style={{
              color: props.theme != null ? props.theme.uploadToS3TitleColor : defaultTheme.uploadToS3TitleColor
            }}>
              {
                flow === Config.FLOW_INIT ? Constants.TITLE_FLOW_INIT : flow === Config.FLOW_IMG_CHOSEN ? Constants.TITLE_FLOW_IMAGE_CHOSEN : flow === Config.FLOW_CROP ? Constants.TITLE_FLOW_CROP : flow === Config.FLOW_PREVIEW ? Constants.TITLE_FLOW_PREVIEW : flow === Config.FLOW_UPLOAD ? Constants.TITLE_FLOW_UPLOAD : flow === Config.FLOW_SUCESS ? Constants.TITLE_FLOW_SUCCESS : flow === Config.FLOW_ERROR ? Constants.TITLE_FLOW_ERROR : flow === Config.FLOW_PDF_CHOSEN ? Constants.TITLE_FLOW_PDF_CHOSEN : flow === Config.FLOW_PDF_PREVIEW ? Constants.TITLE_FLOW_PDF_PREVIEW : flow === Config.FLOW_VIDEO_CHOSEN ? Constants.TITLE_FLOW_VIDEO_CHOSEN : flow === Config.FLOW_VIDEO_PREVIEW ? Constants.TITLE_FLOW_VIDEO_PREVIEW : flow === Config.FLOW_VIDEO_PROCESSING ? Constants.TITLE_FLOW_VIDEO_PROCESSING : ""
              }
              { flow === Config.FLOW_SUCESS  && <Check2Circle className='ms-3'/> }
              { flow === Config.FLOW_ERROR  && <ExclamationCircle className='ms-3'/> }
          </div>
        </Col>
      </Row>
      <Row className='justify-content-center'>
        <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
          <div className='d-flex flex-grow-1 text-small justify-content-start'
            style={{
              color: props.theme != null ? props.theme.uploadToS3SubtitleColor : defaultTheme.uploadToS3SubtitleColor
            }}>
            <small>
              {
                flow === Config.FLOW_INIT ? (props.type == 'image' ? 'Images ' + Constants.HINT_FLOW_INIT : props.type == 'video' ? 'Videos ' + Constants.HINT_FLOW_INIT : 'PDFs ' + Constants.HINT_FLOW_INIT) : flow === Config.FLOW_IMG_CHOSEN ? Constants.HINT_FLOW_IMAGE_CHOSEN : flow === Config.FLOW_CROP ? Constants.HINT_FLOW_CROP : flow === Config.FLOW_PREVIEW ? Constants.HINT_FLOW_PREVIEW : flow === Config.FLOW_UPLOAD ? Constants.HINT_FLOW_UPLOAD : flow === Config.FLOW_SUCESS ? Constants.HINT_FLOW_SUCCESS : flow === Config.FLOW_ERROR ? Constants.HINT_FLOW_ERROR : flow === Config.FLOW_PDF_CHOSEN ? Constants.HINT_FLOW_PDF_CHOSEN : flow === Config.FLOW_PDF_PREVIEW ? Constants.HINT_FLOW_PDF_PREVIEW : flow === Config.FLOW_VIDEO_CHOSEN ? Constants.HINT_FLOW_VIDEO_CHOSEN : flow === Config.FLOW_VIDEO_PREVIEW ? Constants.HINT_FLOW_VIDEO_PREVIEW : flow === Config.FLOW_VIDEO_PROCESSING ? Constants.HINT_FLOW_VIDEO_PROCESSING : ""
              }
            </small>
          </div>
        </Col>
      </Row>
      {flow === Config.FLOW_INIT && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex text-small justify-content-start pt-3'>
              <ButtonNext caption="Choose" disabled={false} icon={props.type=="image" ? 'FileImage' : props.type=="pdf" ? 'FilePdf' : 'FilePlay'} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3ChooseBackgroundColor : defaultTheme.uploadToS3ChooseBackgroundColor, color: props.theme != null ? props.theme.uploadToS3ChooseColor : defaultTheme.uploadToS3ChooseColor}}/>
            </div>
          </Col>
        </Row>
      }
      {(flow === Config.FLOW_IMG_CHOSEN) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <div className="me-2 flex-grow-1 d-flex justify-content-start" >
                <ButtonNeutral caption="Cancel" disabled={false} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}} onClick={(event) => {event.stopPropagation(); onCancelClicked();}}/>
              </div>
              <div className="me-2" >
                <ButtonNeutral className="me-2" caption="Crop" disabled={false} icon="Crop" onClick={(event) => {event.stopPropagation(); onCropClicked();}} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}} />
              </div>
              <ButtonNeutral caption="Upload" disabled={false} icon="Upload" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onUploadClick()}}/>
            </div>
          </Col>
        </Row>
      }
      {(flow === Config.FLOW_PDF_CHOSEN) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted mt-3`} >
            
            <div className="alert alert-secondary" role="alert">
              <FilePdf className='me-2' style={{marginBottom: '2px'}}/>
              {
                 pdfName + ' ' + parseFloat(pdfSize).toFixed(2) + ' KB'
              }
            </div>
          </Col>
        </Row>
      }
      {(flow === Config.FLOW_VIDEO_CHOSEN) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted mt-3`} >
            
            <div className="alert alert-secondary" role="alert">
              <FileEarmarkPlay className='me-2' style={{marginBottom: '2px'}}/>
              {
                videoName
              }
              <br /><b>Duration &nbsp;</b>
              {
                new Date(videoDuration * 1000).toISOString().substring(11, 19)
              }
              <br /><b>Size &nbsp;</b>
              {
                parseFloat(videoSize).toFixed(2) + ' KB'
              }
            </div>
          </Col>
        </Row>
      }
      {(flow === Config.FLOW_PDF_CHOSEN) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <div className="me-2 flex-grow-1 d-flex justify-content-start" >
                <ButtonNeutral caption="Cancel" disabled={false} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}}  onClick={(event) => {event.stopPropagation(); onCancelClicked();}} />
              </div>
              <div className="me-2" >
                <ButtonNeutral className="me-2" caption="Preview" disabled={false} icon="Eye" onClick={(event) => {event.stopPropagation(); onPreviewClicked();}} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}} />
              </div>
              <ButtonNeutral caption="Upload" disabled={false} icon="Upload" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onUploadClick()}}/>
            </div>
          </Col>
        </Row>
      }
      {(flow === Config.FLOW_VIDEO_CHOSEN) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <div className="me-2 flex-grow-1 d-flex justify-content-start" >
                <ButtonNeutral caption="Cancel" disabled={false} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}}  onClick={(event) => {event.stopPropagation(); onCancelClicked();}}/>
              </div>
              <ButtonNeutral className="me-2" caption="Preview" disabled={false} icon="Eye" onClick={(event) => {event.stopPropagation(); onPreviewClicked();}} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}   />
              {/* <ButtonNeutral className="ms-2" caption="Upload" disabled={false} icon="Upload" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onUploadClick()}} /> */}
            </div>
          </Col>
        </Row>
      }
      {(flow === Config.FLOW_CROP) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <div className="me-2 flex-grow-1 d-flex justify-content-start" >
                <ButtonNeutral caption="Cancel" disabled={false}  custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}}  onClick={(event) => {event.stopPropagation(); onCancelClicked();}}/>
              </div>
              <div className="me-2" >
                <ButtonNeutral className="me-2" caption="Preview" disabled={false} icon="Eye" onClick={(event) => {event.stopPropagation(); onPreviewClicked();}} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}} />
              </div>
              <ButtonNeutral caption="Upload" disabled={false} icon="Upload" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onUploadClick()}}/>
            </div>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_PREVIEW) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <div className="me-2 flex-grow-1 d-flex justify-content-start" >
                <ButtonNeutral caption="Cancel" disabled={false}  custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}}  onClick={(event) => {event.stopPropagation(); onCancelClicked();}}/>
              </div>
              <ButtonNeutral caption="Upload" disabled={false} icon="Upload" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onUploadClick()}}/>
            </div>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_PDF_PREVIEW) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <div className="me-2 flex-grow-1 d-flex justify-content-start" >
                <ButtonNeutral caption="Cancel" disabled={false} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}}  onClick={(event) => {event.stopPropagation(); onCancelClicked();}}/>
              </div>
              <ButtonNeutral caption="Upload" disabled={false} icon="Upload" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onUploadClick()}}/>
            </div>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_VIDEO_PREVIEW) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <div className="me-2 flex-grow-1 d-flex justify-content-start" >
                <ButtonNeutral caption="Cancel" disabled={false}  custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3CancelBackgroundColor : defaultTheme.uploadToS3CancelBackgroundColor, color: props.theme != null ? props.theme.uploadToS3CancelColor : defaultTheme.uploadToS3CancelColor}}  onClick={(event) => {event.stopPropagation(); onCancelClicked();}}/>
              </div>
              <div className="me-2" >
                {(videoStartPosition != null && (videoStartPosition > 0 || videoEndPosition > 0)) && <ButtonNeutral className="me-2" caption="Upload Clip" disabled={false} icon="Scissors" onClick={(event) => {event.stopPropagation(); onUploadClick();}}  custom={{backgroundColor: 'black', color: 'white'}} />}
                {(videoStartPosition == null || (videoStartPosition === 0 && videoEndPosition === 0)) && <ButtonNeutral className="me-2" caption="Upload Clip" disabled={true} icon="Scissors" />}
              </div>
              {(videoStartPosition == null || (videoStartPosition === 0 && videoEndPosition === 0)) && <ButtonNeutral caption="Upload" disabled={false} icon="Upload" onClick={(event) => {event.stopPropagation(); onUploadClick()}} custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}} />}
              
            </div>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_SUCESS && (props.showNewUpload == null || (props.showNewUpload != null && props.showNewUpload != false))) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <ButtonNeutral caption="New Upload" disabled={false} icon="PlusCircle" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onNewUploadClick()}}/>
            </div>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_ERROR) && 
        <Row className='justify-content-center'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div className='d-flex flex-grow-1 text-small justify-content-end pt-3'>
              <ButtonNeutral caption="Try Again" disabled={false} icon="PlusCircle" custom={{backgroundColor: props.theme != null ? props.theme.uploadToS3UploadBackgroundColor : defaultTheme.uploadToS3UploadBackgroundColor, color: props.theme != null ? props.theme.uploadToS3UploadColor : defaultTheme.uploadToS3UploadColor}}  onClick={(event) => {event.stopPropagation(); onNewUploadClick()}}/>
            </div>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_PDF_PREVIEW) &&
        <Row className='justify-content-center mt-3'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <iframe width='100%' style={{height: '50vh'}} src={src}></iframe>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_VIDEO_PREVIEW) &&
        <Row className='justify-content-center mt-3'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center pt-2 px-3 justify-content-center border-top`} >
            <Container className='p-0 ms-0 me-0 mb-0 mt-2 w-100' >
              <Row className='m-0 p-0'>
                <Col className='m-0 p-0' sm={12} xs={12} md={12} lg={12} xl={12} xxl={12}  style={{
                    position: 'relative'
                  }}>

                  <div className='w-100 mb-2'>
                    <small><b className='text-muted'>Thumbnail</b></small>
                  </div>
                  <div className='d-flex justify-content-between align-items-center mb-3'>
                    <div className='d-flex align-items-center' >
                      <canvas className='me-3 rounded-3' ref={refCanvasThumbnail} style={{width: Config.THUMBNAIL_WIDTH + 'px'}} /> 
                      <Button variant="btn btn-sm btn-secondary py-1 px-2" onClick={() => {captureThumbnail()}}>Capture&nbsp;&nbsp;<CameraFill style={{marginBottom: '2px'}}/></Button>
                    </div>
                    <Button variant="btn btn-sm btn-outline py-1 px-2 ms-3" onClick={() => {showThumbnail(true)}}>View&nbsp;&nbsp;<Icons.EyeFill style={{marginBottom: '2px'}}/></Button>                    
                  </div>

                </Col>
                <Col className='m-0 p-0' sm={12} xs={12} md={12} lg={12} xl={12} xxl={12}  style={{
                    position: 'relative'
                  }}>

                  <div className='w-100 mb-2'>
                    <small><b className='text-muted'>Preview &amp; Clip Video</b></small>
                  </div>

                  <div className='w-100' style={{
                    position: 'relative'
                  }}>
                    <div
                      className='d-flex justify-content-center'
                      style={{
                        width: '100%',
                        position: 'relative',
                        }}>
                        <video ref={refInputVideoPreview} controls autoPlay style={{backgroundColor: 'black', width: '100%', height: '50vh'}} src={src} onTimeUpdate={onTimeUpdate}></video>
                        <div 
                          style={{
                            position: 'absolute',
                            left: windowDimensions.height < windowDimensions.width ? '2%' : '5%',
                            right: windowDimensions.height < windowDimensions.width ? '2%' : '5%',
                            height: '100%',
                            width: windowDimensions.height < windowDimensions.width ? '96%' : '90%',
                            pointerEvents: 'none'
                          }}>
                          <div 
                            style={{
                              position: 'absolute',
                              top: '80%',
                              left: '0px',
                              background: 'repeating-linear-gradient(135deg, white,white 10px,red 10px,red 20px',
                              opacity: '0.3',
                              width: (videoStartPosition == null || videoStartPosition == 0) ? '0%' : (((videoStartPosition*100)/videoDuration)) + '%',
                              height: '20%',
                              pointerEvents: 'none',
                              borderRight: 'dotted 1px white'
                            }}>
                          </div>
                          <div 
                            style={{
                              position: 'absolute',
                              top: '0px',
                              left: '0px',
                              background: 'repeating-linear-gradient(135deg, white,white 10px,red 10px,red 20px',
                              opacity: '0.3',
                              width: (videoStartPosition == null || videoStartPosition == 0) ? '0%' : (((videoStartPosition*100)/videoDuration)) + '%',
                              height: '20%',
                              pointerEvents: 'none',
                              borderRight: 'dotted 1px white'
                            }}>
                          </div>
                          <div 
                            style={{
                              position: 'absolute',
                              top: '80%',
                              right: '0px',
                              background: 'repeating-linear-gradient(135deg, white,white 10px,red 10px,red 20px',
                              opacity: '0.3',
                              width: (videoEndPosition == null || videoEndPosition == 0) ? '0%' : (((videoDuration - videoEndPosition)*100)/videoDuration) + '%',
                              height: '20%',
                              pointerEvents: 'none',
                              borderRight: 'dotted 1px left'
                            }}>
                          </div>
                          <div 
                            style={{
                              position: 'absolute',
                              top: '0px',
                              right: '0px',
                              background: 'repeating-linear-gradient(135deg, white,white 10px,red 10px,red 20px',
                              opacity: '0.3',
                              width: (videoEndPosition == null || videoEndPosition == 0) ? '0%' : (((videoDuration - videoEndPosition)*100)/videoDuration) + '%',
                              height: '20%',
                              pointerEvents: 'none',
                              borderRight: 'dotted 1px left'
                            }}>
                          </div>
                        </div>
                    </div>


                    <div className='w-100 p-2' style={{position: 'absolute', top: '0px', left: '0px'}}>

                      <div className='d-flex flex-wrap align-items-center justify-content-between'>
                        
                        <div className='d-flex align-items-center' style={{cursor: 'pointer'}}>
                          <ButtonNeutral caption="Mark Start" disabled={disableMarkStart} icon="Scissors" onClick={onMarkStartPosition} />
                        </div>
                        <div className='d-flex align-items-center' style={{cursor: 'pointer'}}>
                          <ButtonNeutral caption="Mark End" disabled={disableMarkEnd} icon="Scissors" onClick={onMarkEndPosition} />
                        </div>

                      </div>
                      
                      <div className='d-flex flex-wrap align-items-center justify-content-between text-muted'>
                        <div className='d-flex align-items-center' style={{cursor: 'pointer'}}>
                          <small>
                            {(videoStartPosition != null && videoStartPosition > 0) && 
                            <div className='d-flex align-items-center' onClick={gotoStartPosition} style={{backgroundColor: 'black', color: 'white'}}>
                              {new Date(videoStartPosition * 1000).toISOString().substring(11, 19)}
                              &nbsp;
                              <BoxArrowRight />
                            </div>
                            }
                          </small>
                        </div>
                        <div className='d-flex align-items-center' style={{cursor: 'pointer'}}>            
                          <small>
                          {(videoEndPosition != null && videoEndPosition > 0) && 
                            <div className='d-flex align-items-center' onClick={gotoEndPosition} style={{backgroundColor: 'black', color: 'white'}}>
                              <BoxArrowLeft />
                              &nbsp;
                              {new Date(videoEndPosition * 1000).toISOString().substring(11, 19)}
                            </div>
                          }
                          </small>
                        </div>
                      </div>

                    </div>

                  </div>


                </Col>

              </Row>
              <div className='d-flex justify-content-start align-items-start'>
                <div className='d-flex justify-content-start align-items-start flex-column' style={{position: 'relative'}}>
                    
                </div>
                <div className='flex-grow-1' style={{position: 'relative'}}>


                </div>
              </div>
              
            </Container>
          </Col>
        </Row>
      }

      {(flow === Config.FLOW_VIDEO_PREVIEW && subFlow === Config.FLOW_VIDEO_PREVIEW_THUMBNAIL_VIEW) && 
        <div className='d-flex justify-content-center align-items-center' style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          left: '0px',
          top: '0px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}>

          <div className='d-flex justify-content-center align-items-center' style={{
            position: 'relative',
            width: '70%',
            height: '60%',
          }}>

            <img src={srcThumbnail} style={{
              maxWidth: '100%',
              maxHeight: '100%'
            }} />

            <Button variant="btn btn-outline" style={{
              position: 'absolute',
              width: '100px',
              bottom: '0px',
              right: '0px',
              left: '50%',
              marginLeft: '-50px',
              color: 'white'
            }} onClick={() => {showThumbnail(false)}}>
            Close &nbsp;<Icons.X />
            </Button>
          </div>

        </div>
      }

      {(flow === Config.FLOW_IMG_CHOSEN || flow === Config.FLOW_CROP || flow === Config.FLOW_PREVIEW) &&
        <Row className='justify-content-center mt-2'>
          <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
            <div 
              ref={refCanvasContainer} 
              onTouchMove={(event) => {onMouseMove(event)}}
              onTouchStart={(event) => {onMouseDown(event)}}
              onTouchEnd={(event) => {onMouseUp(event)}}
              // onDrag={(event) => {onMouseMove(event)}}
              // onDragStart={(event) => {onMouseDown(event)}}
              // onDragEnd={(event) => {onMouseUp(event)}}
              onMouseMove={(event) => {onMouseMove(event)}}
              onMouseDown={(event) => {onMouseDown(event)}}
              onMouseUp={(event) => {onMouseUp(event)}}
              className='d-flex text-small justify-content-start mt-3 w-100' 
              style={{position: 'relative'}}>
              
              <img src={src} className="w-100" 
                style={{
                  backgroundColor: 'green',
                  visibility: flow === Config.FLOW_PREVIEW ? 'hidden' : 'visible',
                  pointerEvents: 'none'
                }}
                />
              
              
              {flow === Config.FLOW_CROP && <div style={{
                position: 'absolute',
                left: '0px',
                top: '0px',
                width: '100%',
                height: '100%',
                opacity: '0.5',
                backgroundColor: 'black',
                opacity: '0.5',
                pointerEvents: 'none',
                cursor: 'pointer',
              }}>

              </div>}
              
              {(flow === Config.FLOW_CROP || flow === Config.FLOW_PREVIEW) && <div 
                style={{
                  position: 'absolute',
                  left: cropInitX1 + '%',
                  top: cropInitY1 + '%',
                  width: (cropInitX2 - cropInitX1) + '%',
                  height: (cropInitY2 - cropInitY1) + '%',
                  background:`linear-gradient(to right, black 4px, transparent 4px) 0 0,
    linear-gradient(to right, black 4px, transparent 4px) 0 100%,
    linear-gradient(to left, black 4px, transparent 4px) 100% 0,
    linear-gradient(to left, black 4px, transparent 4px) 100% 100%,
    linear-gradient(to bottom, black 4px, transparent 4px) 0 0,
    linear-gradient(to bottom, black 4px, transparent 4px) 100% 0,
    linear-gradient(to top, black 4px, transparent 4px) 0 100%,
    linear-gradient(to top, black 4px, transparent 4px) 100% 100%`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '20px 20px',
                  padding: '2px',
                  pointerEvents: 'none',
                  cursor: 'pointer'
                }}>
                      <canvas ref={refCanvas} className="w-100 h-100" style={{backgroundColor: 'transparent', imageRendering: 'pixelated', imageRendering: 'optimizespeed', pointerEvents: 'none'}}></canvas>
              </div>}

              {flow === Config.FLOW_CROP && <div 
                style={{
                  position: 'absolute',
                  left: '0%',
                  top: '0%',
                  width: '100%',
                  height: '100%',
                  background:`transparent`,
                  pointerEvents: 'none',
                  cursor: 'pointer',
                }}>
                      <canvas ref={refCanvasOverlay} className="w-100 h-100" style={{backgroundColor: 'transparent', imageRendering: 'pixelated', imageRendering: 'optimizespeed',pointerEvents: 'none'}}></canvas>
              </div>}
            </div>
          </Col>
        </Row>
      }
      
      <Row className='justify-content-center' style={{display: 'none'}}>
        <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
          <CloudArrowUp className='me-3 ms-2' style={{visibility: 'hidden'}}/>
          <div className='d-flex text-small justify-content-start pt-3'>
            <input ref={refInputImage} type="file" accept="image/*" onChange={onFileSelectionChanged}  />
          </div>
        </Col>
      </Row>

      <Row className='justify-content-center' style={{display: 'none'}}>
        <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
          <CloudArrowUp className='me-3 ms-2' style={{visibility: 'hidden'}}/>
          <div className='d-flex text-small justify-content-start pt-3'>
            <input ref={refInputPdf} type="file" accept="application/pdf" onChange={onFileSelectionChanged}  />
          </div>
        </Col>
      </Row>


      <Row className='justify-content-center' style={{display: 'none'}}>
        <Col sm={12} xs={12} md={12} xxl={12} className={`d-flex flex-wrap align-items-center px-3 text-muted`} >
          <CloudArrowUp className='me-3 ms-2' style={{visibility: 'hidden'}}/>
          <div className='d-flex text-small justify-content-start pt-3'>
            <input ref={refInputVideo} onTimeUpdate={onTimeUpdate} type="file" accept="video/*" onChange={onFileSelectionChanged}  />
          </div>
        </Col>
      </Row>

    </Container>
  )
}
