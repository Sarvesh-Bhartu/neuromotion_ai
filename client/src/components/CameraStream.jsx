import { useEffect, useRef, useState } from 'react'
import { FilesetResolver, PoseLandmarker, DrawingUtils } from '@mediapipe/tasks-vision'

export default function CameraStream({ onLandmarks }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)
  
  const landmarkerRef = useRef(null)
  let lastVideoTime = -1

  useEffect(() => {
    let active = true

    const initializeMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        )
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            // Using the lite model for highest FPS in browser MVP
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
            delegate: "GPU" // Attempt GPU acceleration
          },
          runningMode: "VIDEO",
          numPoses: 1
        })
        
        if (active) {
          landmarkerRef.current = poseLandmarker
          setIsLoaded(true)
          startCamera()
        }
      } catch (err) {
        console.error("MediaPipe Init Error:", err)
        setError("Failed to load Vision Engine.")
      }
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" }
        })
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream
          streamRef.current = stream
        }
      } catch (err) {
         setError("Camera access denied.")
      }
    }

    initializeMediaPipe()

    return () => {
      active = false
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (landmarkerRef.current) {
         landmarkerRef.current.close()
      }
    }
  }, [])

  const handleVideoPlay = () => {
    let animationFrameId
    const drawingUtils = new DrawingUtils(canvasRef.current.getContext('2d'))

    const predictWebcam = () => {
      if (!videoRef.current || !landmarkerRef.current || !canvasRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")

      // Ensure canvas matches video resolution
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
      }

      let startTimeMs = performance.now()
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime
        
        const results = landmarkerRef.current.detectForVideo(video, startTimeMs)
        
        ctx.save()
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]
          
          if (onLandmarks) onLandmarks(landmarks)

          // Draw skeleton (using brand colors)
          drawingUtils.drawConnectors(landmarks, PoseLandmarker.POSE_CONNECTIONS, { color: '#D6EAF3', lineWidth: 4 })
          drawingUtils.drawLandmarks(landmarks, { color: '#1A6B8A', lineWidth: 2, radius: 4 })
        }
        ctx.restore()
      }
      animationFrameId = requestAnimationFrame(predictWebcam)
    }

    predictWebcam()

    return () => cancelAnimationFrame(animationFrameId)
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden rounded-xl">
      {!isLoaded && !error && (
        <div className="absolute z-10 text-brand-light flex flex-col items-center">
          <div className="w-8 h-8 border-4 border-brand-light border-t-brand-blue rounded-full animate-spin mb-2"></div>
          Initializing Vision Engine...
        </div>
      )}
      
      {error && (
        <div className="absolute z-10 text-alert-red bg-white p-4 rounded text-center">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Raw video element playing beneath canvas */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlay={handleVideoPlay}
        className="absolute w-full h-full object-cover -scale-x-100" // mirror
      ></video>

      {/* Canvas shows the mirrored video feed + skeleton drawing */}
      <canvas
        ref={canvasRef}
        className="absolute w-full h-full object-cover -scale-x-100" // mirror the context so it feels like a mirror
      ></canvas>
    </div>
  )
}
