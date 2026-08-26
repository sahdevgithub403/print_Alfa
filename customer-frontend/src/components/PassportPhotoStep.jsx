import React, { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { uploadDocument, calculatePrice } from "../api";

export const PassportPhotoStep = ({ shopId, onComplete, onBack }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [quantity, setQuantity] = useState(8);
  const [photoSize, setPhotoSize] = useState("PASSPORT"); // PASSPORT or STAMP
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => setImageSrc(reader.result));
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createCroppedImage = async (imageSrc, cropPixels) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        canvas.width = cropPixels.width;
        canvas.height = cropPixels.height;
        
        ctx.drawImage(
          image,
          cropPixels.x,
          cropPixels.y,
          cropPixels.width,
          cropPixels.height,
          0,
          0,
          cropPixels.width,
          cropPixels.height
        );
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          blob.name = "passport_photo.jpg";
          resolve(blob);
        }, "image/jpeg", 0.95);
      };
      image.onerror = () => reject(new Error("Failed to load image"));
    });
  };

  const generateLayoutCanvas = async (croppedImageBlob) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // A4 physical dimensions at 300 DPI: 2480 x 3508. But let's use 4x6 size for photos: 1200 x 1800 at 300dpi.
        canvas.width = 1200;
        canvas.height = 1800;
        
        // Fill white background
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Passport size: ~3.5cm x 4.5cm. At 300dpi it's about 413 x 531 pixels.
        // Let's draw the grid based on quantity.
        const cols = 2;
        const rows = Math.ceil(quantity / cols);
        const photoWidth = photoSize === "PASSPORT" ? 413 : 300;
        const photoHeight = photoSize === "PASSPORT" ? 531 : 380;
        
        const spacingX = (canvas.width - (cols * photoWidth)) / (cols + 1);
        const spacingY = 50;
        let startY = 100;
        
        let count = 0;
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            if (count >= quantity) break;
            const x = spacingX + col * (photoWidth + spacingX);
            const y = startY + row * (photoHeight + spacingY);
            
            // Draw photo
            ctx.drawImage(image, x, y, photoWidth, photoHeight);
            
            // Draw subtle border
            ctx.strokeStyle = "#CCCCCC";
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, photoWidth, photoHeight);
            
            count++;
          }
        }
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Canvas is empty"));
            return;
          }
          // We can name the file based on quantity
          const filename = `layout_${quantity}_photos.jpg`;
          const file = new File([blob], filename, { type: "image/jpeg" });
          resolve(file);
        }, "image/jpeg", 0.9);
      };
      image.src = URL.createObjectURL(croppedImageBlob);
    });
  };

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    
    try {
      const croppedBlob = await createCroppedImage(imageSrc, croppedAreaPixels);
      const layoutFile = await generateLayoutCanvas(croppedBlob);
      
      // Upload the generated layout file to the server
      const uploadedDoc = await uploadDocument(layoutFile);
      
      const settings = {
        printType: "PASSPORT_PHOTO",
        colorMode: "COLOR",
        paperSize: "A4", 
        printSide: "SINGLE",
        pageRange: "ALL",
        copies: 1, // 1 sheet
      };

      // Calculate price
      const pricingData = await calculatePrice({
        shopId,
        documentId: uploadedDoc.id,
        ...settings,
      });

      const item = {
        localId: Date.now().toString(),
        file: layoutFile,
        uploadedDocument: uploadedDoc,
        settings,
        pricing: pricingData || null,
      };

      onComplete([item]);
    } catch (err) {
      console.error("Error processing passport photo", err);
      alert("Failed to process photo. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-bold text-[#6B6B6B] hover:text-[#111111] px-3 py-2 -ml-3 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to type selection</span>
      </button>

      <div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111111] tracking-tight">
          Passport Photo
        </h2>
        <p className="text-base text-[#6B6B6B] mt-2 font-medium">
          Upload and adjust your photo for printing.
        </p>
      </div>

      {!imageSrc ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="bg-brand-50 border-2 border-dashed border-brand-200 rounded-2xl p-8 sm:p-12 text-center cursor-pointer hover:bg-brand-100/50 hover:border-brand-300 transition-all group"
        >
          <div className="w-16 h-16 mx-auto bg-white rounded-2xl flex items-center justify-center shadow-sm border border-brand-100 group-hover:scale-105 transition-transform duration-300">
            <UploadCloud className="w-8 h-8 text-brand-600" />
          </div>
          <h3 className="text-lg font-bold text-brand-900 mt-4">
            Upload your photo
          </h3>
          <p className="text-sm text-brand-700/80 mt-1 font-medium max-w-xs mx-auto">
            Choose a clear, front-facing photo from your gallery.
          </p>
          <button className="mt-6 px-6 py-2.5 bg-white text-brand-700 font-bold text-sm rounded-xl border border-brand-200 shadow-sm">
            Select Photo
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E2E2E2] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold text-[#111111]">Adjust Photo</span>
              <button 
                onClick={() => setImageSrc(null)}
                className="text-sm font-bold text-rose-600 hover:text-rose-700"
              >
                Change Photo
              </button>
            </div>
            
            <div className="relative w-full h-[400px] sm:h-[450px] bg-neutral-900 rounded-xl overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={photoSize === "PASSPORT" ? 3.5 / 4.5 : 1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="mt-4 px-2">
              <label className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider mb-2 block">
                Zoom
              </label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(e.target.value)}
                className="w-full accent-brand-600"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              Photo Size
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => setPhotoSize("PASSPORT")}
                className={`selection-row min-h-[64px] px-4 cursor-pointer ${photoSize === "PASSPORT" ? "selection-row-active" : "bg-white border-2 border-[#E2E2E2]"}`}
              >
                <span className="font-bold text-sm">Passport Size</span>
              </div>
              <div 
                onClick={() => setPhotoSize("STAMP")}
                className={`selection-row min-h-[64px] px-4 cursor-pointer ${photoSize === "STAMP" ? "selection-row-active" : "bg-white border-2 border-[#E2E2E2]"}`}
              >
                <span className="font-bold text-sm">Stamp Size</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">
              How many photos?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[4, 6, 8, 12].map((num) => (
                <div 
                  key={num}
                  onClick={() => setQuantity(num)}
                  className={`selection-row min-h-[64px] px-4 cursor-pointer ${quantity === num ? "selection-row-active" : "bg-white border-2 border-[#E2E2E2]"}`}
                >
                  <span className="font-bold text-sm">{num} Photos</span>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="btn-primary w-full"
          >
            {isProcessing ? "Processing Layout..." : "Confirm & Continue"}
          </button>
        </div>
      )}
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
