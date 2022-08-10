# react-upload-to-s3

> The all-in-one react-only component for uploading images, documents and videos to AWS S3. This is a pure front-end component and only requires AWS configuration at the backend, no backend code is necessary.

[![NPM](https://img.shields.io/npm/v/react-upload-to-s3.svg)](https://www.npmjs.com/package/react-upload-to-s3) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## How it can be used

### Upload an image to S3 (with easy crop)

<ul>
<li>Choose an image</li>
<li>Preview it</li>
<li>Crop it if required</li>
<li>Upload to S3</li>
</ul>
<a href="https://youtu.be/Qh3JkrE0UEI"><img src="https://user-images.githubusercontent.com/108924653/182695777-9eb6cd08-d2e2-4e32-b1ba-f9e592c14abf.png" width="300"/></a>

### Upload a video to S3 (with easy clip)

<ul>
<li>Choose a video</li>
<li>Preview it</li>
<li>Clip it if required</li>
<li>Upload to S3</li>
</ul>
<a href="https://youtu.be/9TeJgi-irF4"><img src="https://user-images.githubusercontent.com/108924653/182755648-b1515130-bfae-424d-8629-401e85303243.png" width="300"/></a>

### Upload a pdf to S3

<ul>
<li>Choose a pdf</li>
<li>Preview it</li>
<li>Upload to S3</li>
</ul>
<a href="https://youtu.be/orIp4-xkbcU"><img src="https://user-images.githubusercontent.com/108924653/182761287-ab320e73-17da-418b-91de-d1cf4aa88603.png" width="300"/></a>

## Demo

[![Demo](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/edit/react-ts-kz4eqr?file=App.tsx)

## Install

```bash
npm install --save react-upload-to-s3
```
Then install the dependencies

## Dependencies

```bash
npm install --save aws-sdk
npm install --save bootstrap
npm install --save react-bootstrap
npm install --save react-bootstrap-icons
npm install --save react-ui-components-superflows
npm install --save react-ui-themes-superflows
```

## Configuration

### AWS S3

- Create an S3 bucket via the AWS admin console, say name of the bucket is **myuploads**
- Set the bucket policy as follows
```bash
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicListGet",
            "Effect": "Allow",
            "Principal": "*",
            "Action": [
                "s3:List*",
                "s3:Get*"
            ],
            "Resource": [
                "arn:aws:s3:::myuploads",
                "arn:aws:s3:::myuploads/*"
            ]
        }
    ]
}
```
- Set the cors policy as follows
```bash
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "DELETE",
            "GET"
        ],
        "AllowedOrigins": [
            "*"
        ],
        "ExposeHeaders": []
    }
]
```

### AWS IAM

#### SDK User

- Create an SDK user via the AWS console so that you get access to aws region, aws access key and aws secret, i.e. aws credentials.
- Ensure that you preserve these credentials in a secure manner.
- It is especially important that these credentials be stored in the environment files and should never be pushed to a source repository such as git.
- For this SDK user, give create, add, edit, delete permissions to your S3 bucket via the AWS console. I usually give full access restricted to a particular bucket, like the one which we created in the S3 section above.

```bash

{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:*",
                "s3-object-lambda:*"
            ],
            "Resource": "arn:aws:s3:::myuploads"
        }
    ]
}

```

- For this SDK user, then give the user access to AWS mediaconvert via the AWS console. I have used AWSElementalMediaConvertFullAccess, which is a pre-created AWS policy for this. To find and attach this policy - Select your IAM user > Click add permissions on the user summary screen > Click attach existing policies directly > Search mediaconvert > Apply the AWSElementalMediaConvertFullAccess policy


#### MediaConvert Role

- Goto IAM > Roles
- Select AWS Service as the trusted entity type
- Choose MediaConvert from the services dropdown
- Click next on add permissions
- Name the role as per your choice. I have named it **mediaconvert_role**. (Remember that this role name has to be given as a prop to the upload-to-s3 component, refer to the Usage section)

### AWS MediaConvert

AWS mediaconvert is required for video processing. The clip selection happens at the client end, whereas the actual clipping is done by an AWS mediaconvert job. This requires a region specific endpoint and can be easily obtained from the aws cli (aws commandline).

```bash
aws mediaconvert describe-endpoints --region <region>
```

Remember that this region specific endpoint also has to be provided as a prop to the upload-to-s3 component. (Refer to the Usage Section)

Once you are through with installing the dependencies and the AWS configuration, using the component becomes fairly simple. Please refer to the Usage below.

## Usage

[![Demo](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/edit/react-ts-kz4eqr?file=App.tsx)

### Props

- bucket: Name of the S3 bucket
- awsRegion: Region where the bucket exists
- awsKey: AWS Access Key (should come from environment variables)
- awsSecret: AWS Secret (should come from environment variables)
- awsMediaConvertEndPoint: AWS region specific mediaconvert endpoint
- type: can be image / video / pdf
- mediaConvertRole: Media convert role
- onResult: Result callback
- theme: UI Theme (optional)
- showNewUpload: Flag which enables the display of New Upload button on the success screen (optional, default value is true)


```jsx

import React from 'react'

import Themes from 'react-ui-themes-superflows'
import { Col, Row, Container } from 'react-bootstrap';
import { UploadToS3 } from 'react-upload-to-s3'
import 'bootstrap/dist/css/bootstrap.min.css';

const App = () => {

    const theme = Themes.getTheme("Default");

    return (
        <Container className='mt-5'>
        <Row className='justify-content-center'>
            
            <Col sm={12} xs={12} md={6} xxl={6}>
            <UploadToS3 
                bucket="myuploads"
                awsRegion="awsRegion"
                awsKey="awsAccessKey"
                awsSecret="awsSecret"
                awsMediaConvertEndPoint="https://*********.mediaconvert.<awsRegion>.amazonaws.com"
                type="pdf"
                mediaConvertRole="mediaconvert_role"
                theme={theme}
                showNewUpload={false}
                onResult={(result) => {console.log('on Result', result);}} />
            </Col>
            
        </Row>
        </Container>
     );

}

export default App

```

## License

MIT © [superflows-dev](https://github.com/superflows-dev)
