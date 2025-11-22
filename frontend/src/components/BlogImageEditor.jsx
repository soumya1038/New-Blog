import React, { useState, useRef, useEffect } from 'react';
import { FiX, FiRotateCw, FiType, FiEdit2, FiCrop, FiZap, FiSquare, FiSun, FiCheck, FiMove, FiTrash2, FiSend, FiSliders, FiEdit3, FiFilter, FiRotateCcw, FiRefreshCw } from 'react-icons/fi';

const BlogImageEditor = ({ imageUrl, onSave, onCancel, caption, onCaptionChange, initialState }) => {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [image, setImage] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [brightness, setBrightness] = useState(initialState?.brightness || 0);
  const [contrast, setContrast] = useState(initialState?.contrast || 0);
  const [saturation, setSaturation] = useState(initialState?.saturation || 0);
  const [rotation, setRotation] = useState(initialState?.rotation || 0);
  const [flipH, setFlipH] = useState(initialState?.flipH || false);
  const [flipV, setFlipV] = useState(initialState?.flipV || false);
  const [drawColor, setDrawColor] = useState('#FFFFFF');
  const [drawSize, setDrawSize] = useState(3);
  const [filter, setFilter] = useState(initialState?.filter || 'none');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showAlignmentGrid, setShowAlignmentGrid] = useState(false);
  const [centerSnap, setCenterSnap] = useState({ x: false, y: false });
  
  // Crop with resize handles
  const [cropRect, setCropRect] = useState(null);
  const [cropDragging, setCropDragging] = useState(null);
  
  // Interactive text objects
  const [texts, setTexts] = useState(initialState?.texts || []);
  const [selectedText, setSelectedText] = useState(null);
  const [textDragging, setTextDragging] = useState(false);
  const [resizingText, setResizingText] = useState(null);
  
  // Interactive shapes
  const [shapes, setShapes] = useState(initialState?.shapes || []);
  const [selectedShape, setSelectedShape] = useState(null);
  const [shapeDragging, setShapeDragging] = useState(false);
  const [shapeType, setShapeType] = useState('rect');
  const [shapeColor, setShapeColor] = useState('#FFFFFF');
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [resizingShape, setResizingShape] = useState(null);
  
  // Text input
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputValue, setTextInputValue] = useState('');
  const [textInputPos, setTextInputPos] = useState({ x: 0, y: 0 });
  
  const colors = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  const filters = [
    { id: 'none', name: 'None' },
    { id: 'bw', name: 'B&W' },
    { id: 'sepia', name: 'Sepia' },
    { id: 'invert', name: 'Invert' }
  ];

  const hasAccessories = (tool) => {
    return ['adjust', 'draw', 'shape', 'filter', 'text', 'crop'].includes(tool);
  };

  const showAccessories = (activeTool && hasAccessories(activeTool) && 
    !(activeTool === 'crop' && (!cropRect || Math.abs(cropRect.width) <= 10 || Math.abs(cropRect.height) <= 10)) &&
    !cropDragging && !textDragging && !shapeDragging && !resizingShape && !resizingText) ||
    ((selectedText !== null || selectedShape !== null) && !textDragging && !shapeDragging && !resizingShape && !resizingText);
  
  const effectiveTool = selectedText !== null ? 'text' : selectedShape !== null ? 'shape' : activeTool;
  
  const handleToolClick = (tool) => {
    // Save any active drawing before switching tools
    if (activeTool === 'draw' && overlayRef.current && canvasRef.current) {
      const overlayCtx = overlayRef.current.getContext('2d');
      const mainCtx = canvasRef.current.getContext('2d');
      const overlayData = overlayCtx.getImageData(0, 0, overlayRef.current.width, overlayRef.current.height);
      const hasDrawing = overlayData.data.some((pixel, i) => i % 4 === 3 && pixel > 0);
      if (hasDrawing) {
        mainCtx.drawImage(overlayRef.current, 0, 0);
        overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        const img = new Image();
        img.onload = () => {
          setImage(img);
        };
        img.src = canvasRef.current.toDataURL();
      }
    }
    // Clear crop when switching tools
    if (activeTool === 'crop') {
      setCropRect(null);
      if (overlayRef.current) {
        overlayRef.current.getContext('2d').clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
    }
    setActiveTool(activeTool === tool ? null : tool);
  };

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setLoading(false);
      drawCanvas(img);
      saveToHistory();
    };
    img.onerror = () => setLoading(false);
    img.src = imageUrl;
  }, [imageUrl]);

  const drawCanvas = (img = image, preserveOverlay = false) => {
    if (!canvasRef.current || !img) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    
    // Save overlay content if needed
    let overlayContent = null;
    if (preserveOverlay && overlayRef.current) {
      const overlayCtx = overlayRef.current.getContext('2d');
      overlayContent = overlayCtx.getImageData(0, 0, overlayRef.current.width, overlayRef.current.height);
    }
    
    const maxWidth = container ? container.clientWidth - 4 : window.innerWidth - 8;
    const maxHeight = container ? container.clientHeight - 4 : window.innerHeight - 144;
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    
    const rad = (rotation * Math.PI) / 180;
    const rotW = Math.abs(img.width * Math.cos(rad)) + Math.abs(img.height * Math.sin(rad));
    const rotH = Math.abs(img.width * Math.sin(rad)) + Math.abs(img.height * Math.cos(rad));
    
    canvas.width = rotW * scale;
    canvas.height = rotH * scale;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;
    ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale);
    ctx.restore();
    
    if (filter !== 'none') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        if (filter === 'bw') {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        } else if (filter === 'sepia') {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        } else if (filter === 'invert') {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }
    
    // Restore overlay content if it was preserved
    if (overlayContent && overlayRef.current) {
      overlayRef.current.width = canvas.width;
      overlayRef.current.height = canvas.height;
      const overlayCtx = overlayRef.current.getContext('2d');
      overlayCtx.putImageData(overlayContent, 0, 0);
    }
    
    // Draw texts
    texts.forEach((text, idx) => {
      ctx.save();
      ctx.translate(text.x, text.y);
      ctx.rotate((text.rotation || 0) * Math.PI / 180);
      const scaleX = text.width / (text.originalWidth || text.width);
      const scaleY = text.height / text.size;
      ctx.scale(scaleX, scaleY);
      ctx.font = `bold ${text.size}px Arial`;
      ctx.fillStyle = text.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.content, 0, 0);
      ctx.restore();
      
      if (selectedText === idx) {
        ctx.save();
        ctx.translate(text.x, text.y);
        ctx.rotate((text.rotation || 0) * Math.PI / 180);
        const w = text.width;
        const h = text.height;
        ctx.strokeStyle = '#25D366';
        ctx.lineWidth = 2;
        ctx.strokeRect(-w/2, -h/2, w, h);
        // Resize handles
        const handles = [
          [-w/2, -h/2], [0, -h/2], [w/2, -h/2],
          [-w/2, 0], [w/2, 0],
          [-w/2, h/2], [0, h/2], [w/2, h/2]
        ];
        handles.forEach(([hx, hy]) => {
          ctx.fillStyle = '#25D366';
          ctx.fillRect(hx - 4, hy - 4, 8, 8);
        });
        ctx.restore();
      }
    });
    
    // Draw shapes
    shapes.forEach((shape, idx) => {
      ctx.strokeStyle = shape.color;
      ctx.lineWidth = 3;
      
      if (shape.type === 'rect' || shape.type === 'square') {
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        if (selectedShape === idx) {
          ctx.strokeStyle = '#25D366';
          ctx.lineWidth = 2;
          ctx.strokeRect(shape.x - 5, shape.y - 5, shape.width + 10, shape.height + 10);
          // Resize handles
          const handles = [
            [shape.x, shape.y], [shape.x + shape.width/2, shape.y], [shape.x + shape.width, shape.y],
            [shape.x, shape.y + shape.height/2], [shape.x + shape.width, shape.y + shape.height/2],
            [shape.x, shape.y + shape.height], [shape.x + shape.width/2, shape.y + shape.height], [shape.x + shape.width, shape.y + shape.height]
          ];
          handles.forEach(([hx, hy]) => {
            ctx.fillStyle = '#25D366';
            ctx.fillRect(hx - 4, hy - 4, 8, 8);
          });
        }
      } else if (shape.type === 'circle') {
        const rx = shape.radiusX || shape.radius;
        const ry = shape.radiusY || shape.radius;
        ctx.beginPath();
        ctx.ellipse(shape.x, shape.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (selectedShape === idx) {
          ctx.strokeStyle = '#25D366';
          ctx.lineWidth = 2;
          ctx.strokeRect(shape.x - rx, shape.y - ry, rx * 2, ry * 2);
          // 8 resize handles
          const handles = [
            [shape.x - rx, shape.y - ry], [shape.x, shape.y - ry], [shape.x + rx, shape.y - ry],
            [shape.x - rx, shape.y], [shape.x + rx, shape.y],
            [shape.x - rx, shape.y + ry], [shape.x, shape.y + ry], [shape.x + rx, shape.y + ry]
          ];
          handles.forEach(([hx, hy]) => {
            ctx.fillStyle = '#25D366';
            ctx.fillRect(hx - 6, hy - 6, 12, 12);
          });
        }
      } else if (shape.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.stroke();
        const angle = Math.atan2(shape.height, shape.width);
        const arrowLen = 15;
        ctx.beginPath();
        ctx.moveTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x + shape.width - arrowLen * Math.cos(angle - Math.PI/6), shape.y + shape.height - arrowLen * Math.sin(angle - Math.PI/6));
        ctx.moveTo(shape.x + shape.width, shape.y + shape.height);
        ctx.lineTo(shape.x + shape.width - arrowLen * Math.cos(angle + Math.PI/6), shape.y + shape.height - arrowLen * Math.sin(angle + Math.PI/6));
        ctx.stroke();
        if (selectedShape === idx) {
          ctx.strokeStyle = '#25D366';
          ctx.lineWidth = 2;
          const minX = Math.min(shape.x, shape.x + shape.width);
          const minY = Math.min(shape.y, shape.y + shape.height);
          const w = Math.abs(shape.width);
          const h = Math.abs(shape.height);
          ctx.strokeRect(minX, minY, w, h);
          // 8 resize handles
          const handles = [
            [minX, minY], [minX + w/2, minY], [minX + w, minY],
            [minX, minY + h/2], [minX + w, minY + h/2],
            [minX, minY + h], [minX + w/2, minY + h], [minX + w, minY + h]
          ];
          handles.forEach(([hx, hy]) => {
            ctx.fillStyle = '#25D366';
            ctx.fillRect(hx - 4, hy - 4, 8, 8);
          });
        }
      } else if (shape.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.width, shape.y + shape.height);
        ctx.stroke();
        if (selectedShape === idx) {
          ctx.strokeStyle = '#25D366';
          ctx.lineWidth = 2;
          const minX = Math.min(shape.x, shape.x + shape.width);
          const minY = Math.min(shape.y, shape.y + shape.height);
          const w = Math.abs(shape.width);
          const h = Math.abs(shape.height);
          ctx.strokeRect(minX, minY, w, h);
          // 8 resize handles
          const handles = [
            [minX, minY], [minX + w/2, minY], [minX + w, minY],
            [minX, minY + h/2], [minX + w, minY + h/2],
            [minX, minY + h], [minX + w/2, minY + h], [minX + w, minY + h]
          ];
          handles.forEach(([hx, hy]) => {
            ctx.fillStyle = '#25D366';
            ctx.fillRect(hx - 4, hy - 4, 8, 8);
          });
        }
      }
    });
    
    if (overlayRef.current) {
      overlayRef.current.width = canvas.width;
      overlayRef.current.height = canvas.height;
    }
  };

  useEffect(() => {
    if (image && !loading) drawCanvas(image, false);
  }, [brightness, contrast, saturation, rotation, flipH, flipV, filter, texts, shapes, selectedText, selectedShape, image, loading]);

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL();
    setHistory(prev => [...prev.slice(0, historyIndex + 1), dataURL]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        drawCanvas(img);
      };
      img.src = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        drawCanvas(img);
      };
      img.src = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
    }
  };

  const rotateImage = () => {
    setRotation(r => (r + 90) % 360);
  };

  const flipImage = () => {
    setFlipH(!flipH);
  };

  const getCoords = (e) => {
    const canvas = overlayRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startInteraction = (e) => {
    e.preventDefault();
    const { x, y } = getCoords(e);
    
    let hitSomething = false;
    
    // Check text selection and resize handles
    if (selectedText !== null) {
      const text = texts[selectedText];
      const w = text.width;
      const h = text.height;
      const cos = Math.cos((text.rotation || 0) * Math.PI / 180);
      const sin = Math.sin((text.rotation || 0) * Math.PI / 180);
      const dx = x - text.x;
      const dy = y - text.y;
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      
      const handles = [
        { x: -w/2, y: -h/2, cursor: 'nw' },
        { x: 0, y: -h/2, cursor: 'n' },
        { x: w/2, y: -h/2, cursor: 'ne' },
        { x: -w/2, y: 0, cursor: 'w' },
        { x: w/2, y: 0, cursor: 'e' },
        { x: -w/2, y: h/2, cursor: 'sw' },
        { x: 0, y: h/2, cursor: 's' },
        { x: w/2, y: h/2, cursor: 'se' }
      ];
      for (let h of handles) {
        if (Math.abs(localX - h.x) < 8 && Math.abs(localY - h.y) < 8) {
          setResizingText({ handle: h.cursor, startX: x, startY: y, origText: {...text, originalWidth: text.width} });
          return;
        }
      }
    }
    
    for (let i = texts.length - 1; i >= 0; i--) {
      const text = texts[i];
      const w = text.width;
      const h = text.height;
      const cos = Math.cos((text.rotation || 0) * Math.PI / 180);
      const sin = Math.sin((text.rotation || 0) * Math.PI / 180);
      const dx = x - text.x;
      const dy = y - text.y;
      const localX = dx * cos + dy * sin;
      const localY = -dx * sin + dy * cos;
      
      if (localX >= -w/2 && localX <= w/2 && localY >= -h/2 && localY <= h/2) {
        setSelectedText(i);
        setSelectedShape(null);
        setTextDragging({ startX: x, startY: y, textX: text.x, textY: text.y });
        return;
      }
    }
    
    // Check shape selection and resize handles
    if (selectedShape !== null) {
      const shape = shapes[selectedShape];
      if (shape.type === 'rect' || shape.type === 'square') {
        const handles = [
          { x: shape.x, y: shape.y, cursor: 'nw' },
          { x: shape.x + shape.width/2, y: shape.y, cursor: 'n' },
          { x: shape.x + shape.width, y: shape.y, cursor: 'ne' },
          { x: shape.x, y: shape.y + shape.height/2, cursor: 'w' },
          { x: shape.x + shape.width, y: shape.y + shape.height/2, cursor: 'e' },
          { x: shape.x, y: shape.y + shape.height, cursor: 'sw' },
          { x: shape.x + shape.width/2, y: shape.y + shape.height, cursor: 's' },
          { x: shape.x + shape.width, y: shape.y + shape.height, cursor: 'se' }
        ];
        for (let h of handles) {
          if (Math.abs(x - h.x) < 8 && Math.abs(y - h.y) < 8) {
            setResizingShape({ handle: h.cursor, startX: x, startY: y, origShape: {...shape} });
            return;
          }
        }
      } else if (shape.type === 'circle') {
        const rx = shape.radiusX || shape.radius;
        const ry = shape.radiusY || shape.radius;
        const handles = [
          { x: shape.x - rx, y: shape.y - ry, cursor: 'nw' },
          { x: shape.x, y: shape.y - ry, cursor: 'n' },
          { x: shape.x + rx, y: shape.y - ry, cursor: 'ne' },
          { x: shape.x - rx, y: shape.y, cursor: 'w' },
          { x: shape.x + rx, y: shape.y, cursor: 'e' },
          { x: shape.x - rx, y: shape.y + ry, cursor: 'sw' },
          { x: shape.x, y: shape.y + ry, cursor: 's' },
          { x: shape.x + rx, y: shape.y + ry, cursor: 'se' }
        ];
        for (let h of handles) {
          if (Math.abs(x - h.x) < 15 && Math.abs(y - h.y) < 15) {
            const shapeWithRadii = {...shape, radiusX: rx, radiusY: ry};
            delete shapeWithRadii.radius;
            setResizingShape({ handle: h.cursor, startX: x, startY: y, origShape: shapeWithRadii });
            return;
          }
        }
      } else if (shape.type === 'arrow' || shape.type === 'line') {
        const minX = Math.min(shape.x, shape.x + shape.width);
        const minY = Math.min(shape.y, shape.y + shape.height);
        const w = Math.abs(shape.width);
        const h = Math.abs(shape.height);
        const handles = [
          { x: minX, y: minY, cursor: 'nw' },
          { x: minX + w/2, y: minY, cursor: 'n' },
          { x: minX + w, y: minY, cursor: 'ne' },
          { x: minX, y: minY + h/2, cursor: 'w' },
          { x: minX + w, y: minY + h/2, cursor: 'e' },
          { x: minX, y: minY + h, cursor: 'sw' },
          { x: minX + w/2, y: minY + h, cursor: 's' },
          { x: minX + w, y: minY + h, cursor: 'se' }
        ];
        for (let h of handles) {
          if (Math.abs(x - h.x) < 8 && Math.abs(y - h.y) < 8) {
            setResizingShape({ handle: h.cursor, startX: x, startY: y, origShape: {...shape} });
            return;
          }
        }
      }
    }
    
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.type === 'rect' || shape.type === 'square') {
        if (x >= shape.x && x <= shape.x + shape.width && y >= shape.y && y <= shape.y + shape.height) {
          setSelectedShape(i);
          setSelectedText(null);
          setShapeDragging({ startX: x, startY: y, shapeX: shape.x, shapeY: shape.y });
          hitSomething = true;
          return;
        }
      } else if (shape.type === 'circle') {
        const rx = shape.radiusX || shape.radius;
        const ry = shape.radiusY || shape.radius;
        const normalizedX = (x - shape.x) / rx;
        const normalizedY = (y - shape.y) / ry;
        if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
          setSelectedShape(i);
          setSelectedText(null);
          setShapeDragging({ startX: x, startY: y, shapeX: shape.x, shapeY: shape.y });
          hitSomething = true;
          return;
        }
      } else if (shape.type === 'arrow' || shape.type === 'line') {
        const minX = Math.min(shape.x, shape.x + shape.width);
        const minY = Math.min(shape.y, shape.y + shape.height);
        const w = Math.abs(shape.width);
        const h = Math.abs(shape.height);
        if (x >= minX && x <= minX + w && y >= minY && y <= minY + h) {
          setSelectedShape(i);
          setSelectedText(null);
          setShapeDragging({ startX: x, startY: y, shapeX: shape.x, shapeY: shape.y });
          hitSomething = true;
          return;
        }
      }
    }
    
    // Deselect if clicked outside or using another tool
    if (!hitSomething) {
      setSelectedText(null);
      setSelectedShape(null);
    }
    
    // Crop mode with resize handles
    if (activeTool === 'crop') {
      if (cropRect) {
        const handles = [
          { x: cropRect.x, y: cropRect.y, cursor: 'nw' },
          { x: cropRect.x + cropRect.width/2, y: cropRect.y, cursor: 'n' },
          { x: cropRect.x + cropRect.width, y: cropRect.y, cursor: 'ne' },
          { x: cropRect.x, y: cropRect.y + cropRect.height/2, cursor: 'w' },
          { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height/2, cursor: 'e' },
          { x: cropRect.x, y: cropRect.y + cropRect.height, cursor: 'sw' },
          { x: cropRect.x + cropRect.width/2, y: cropRect.y + cropRect.height, cursor: 's' },
          { x: cropRect.x + cropRect.width, y: cropRect.y + cropRect.height, cursor: 'se' }
        ];
        for (let h of handles) {
          if (Math.abs(x - h.x) < 15 && Math.abs(y - h.y) < 15) {
            setCropDragging({ type: 'resize', handle: h.cursor, startX: x, startY: y, origRect: {...cropRect} });
            return;
          }
        }
        if (x >= cropRect.x && x <= cropRect.x + cropRect.width && y >= cropRect.y && y <= cropRect.y + cropRect.height) {
          setCropDragging({ type: 'move', startX: x, startY: y, origRect: {...cropRect} });
          return;
        }
      }
      setCropRect({ x, y, width: 0, height: 0 });
      setCropDragging({ type: 'create' });
    } else if (activeTool === 'draw') {
      setIsDrawing(true);
      const ctx = overlayRef.current.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (activeTool === 'shape') {
      const newShape = { type: shapeType, x, y, color: shapeColor };
      if (shapeType === 'square' || shapeType === 'rect') {
        newShape.width = 100;
        newShape.height = 100;
      } else if (shapeType === 'circle') {
        newShape.radius = 50;
      } else if (shapeType === 'arrow' || shapeType === 'line') {
        newShape.width = 100;
        newShape.height = 0;
      }
      setShapes(prev => [...prev, newShape]);
      setSelectedShape(shapes.length);
      setActiveTool(null);
      saveToHistory();
    } else if (activeTool === 'text') {
      setTextInputPos({ x, y });
      setTextInputValue('');
      setShowTextInput(true);
    }
  };

  const moveInteraction = (e) => {
    e.preventDefault();
    const { x, y } = getCoords(e);
    
    setShowAlignmentGrid(textDragging || shapeDragging || cropDragging);
    
    if (textDragging && selectedText !== null) {
      const dx = x - textDragging.startX;
      const dy = y - textDragging.startY;
      const canvas = canvasRef.current;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const snapThreshold = 5;
      let newX = textDragging.textX + dx;
      let newY = textDragging.textY + dy;
      const snapX = Math.abs(newX - centerX) < snapThreshold;
      const snapY = Math.abs(newY - centerY) < snapThreshold;
      if (snapX) newX = centerX;
      if (snapY) newY = centerY;
      setCenterSnap({ x: snapX, y: snapY });
      setTexts(prev => prev.map((t, i) => i === selectedText ? { ...t, x: newX, y: newY } : t));
    } else if (shapeDragging && selectedShape !== null && !isDrawing) {
      const dx = x - shapeDragging.startX;
      const dy = y - shapeDragging.startY;
      let newX = shapeDragging.shapeX + dx;
      let newY = shapeDragging.shapeY + dy;
      const canvas = canvasRef.current;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const snapThreshold = 5;
      const shape = shapes[selectedShape];
      let shapeCenterX = newX;
      let shapeCenterY = newY;
      if (shape.type === 'rect' || shape.type === 'square') {
        shapeCenterX = newX + shape.width / 2;
        shapeCenterY = newY + shape.height / 2;
      }
      const snapX = Math.abs(shapeCenterX - centerX) < snapThreshold;
      const snapY = Math.abs(shapeCenterY - centerY) < snapThreshold;
      if (snapX) newX = centerX - (shape.type === 'rect' || shape.type === 'square' ? shape.width / 2 : 0);
      if (snapY) newY = centerY - (shape.type === 'rect' || shape.type === 'square' ? shape.height / 2 : 0);
      setCenterSnap({ x: snapX, y: snapY });
      setShapes(prev => prev.map((s, i) => i === selectedShape ? { ...s, x: newX, y: newY } : s));
    } else if (resizingText && selectedText !== null) {
      const dx = x - resizingText.startX;
      const dy = y - resizingText.startY;
      const text = resizingText.origText;
      const handle = resizingText.handle;
      const cos = Math.cos((text.rotation || 0) * Math.PI / 180);
      const sin = Math.sin((text.rotation || 0) * Math.PI / 180);
      const localDx = dx * cos + dy * sin;
      const localDy = -dx * sin + dy * cos;
      
      setTexts(prev => prev.map((t, i) => {
        if (i !== selectedText) return t;
        let newText = {...t, originalWidth: text.originalWidth};
        let newWidth = text.width;
        let newHeight = text.height;
        let offsetX = 0, offsetY = 0;
        
        if (handle.includes('n')) { 
          newHeight = Math.max(16, text.height - localDy); 
          offsetY = localDy / 2;
        }
        if (handle.includes('s')) { 
          newHeight = Math.max(16, text.height + localDy); 
          offsetY = localDy / 2;
        }
        if (handle.includes('w')) { 
          newWidth = Math.max(20, text.width - localDx); 
          offsetX = localDx / 2;
        }
        if (handle.includes('e')) { 
          newWidth = Math.max(20, text.width + localDx); 
          offsetX = localDx / 2;
        }
        
        newText.width = newWidth;
        newText.height = newHeight;
        
        const rotatedOffsetX = offsetX * cos - offsetY * sin;
        const rotatedOffsetY = offsetX * sin + offsetY * cos;
        newText.x = text.x + rotatedOffsetX;
        newText.y = text.y + rotatedOffsetY;
        
        return newText;
      }));
    } else if (resizingShape && selectedShape !== null) {
      const dx = x - resizingShape.startX;
      const dy = y - resizingShape.startY;
      const shape = resizingShape.origShape;
      const handle = resizingShape.handle;
      
      setShapes(prev => prev.map((s, i) => {
        if (i !== selectedShape) return s;
        let newShape = {...s};
        
        if (s.type === 'rect' || s.type === 'square') {
          if (handle.includes('n')) { newShape.y = shape.y + dy; newShape.height = shape.height - dy; }
          if (handle.includes('s')) { newShape.height = shape.height + dy; }
          if (handle.includes('w')) { newShape.x = shape.x + dx; newShape.width = shape.width - dx; }
          if (handle.includes('e')) { newShape.width = shape.width + dx; }
        } else if (s.type === 'circle') {
          const currentRx = shape.radiusX || shape.radius;
          const currentRy = shape.radiusY || shape.radius;
          let newRx = currentRx;
          let newRy = currentRy;
          let newX = shape.x;
          let newY = shape.y;
          
          if (handle.includes('n')) { 
            newRy = Math.max(10, currentRy - dy / 2); 
            newY = shape.y + dy / 2;
          }
          if (handle.includes('s')) { 
            newRy = Math.max(10, currentRy + dy / 2); 
            newY = shape.y + dy / 2;
          }
          if (handle.includes('w')) { 
            newRx = Math.max(10, currentRx - dx / 2); 
            newX = shape.x + dx / 2;
          }
          if (handle.includes('e')) { 
            newRx = Math.max(10, currentRx + dx / 2); 
            newX = shape.x + dx / 2;
          }
          
          newShape.radiusX = newRx;
          newShape.radiusY = newRy;
          newShape.x = newX;
          newShape.y = newY;
          delete newShape.radius;
        } else if (s.type === 'arrow' || s.type === 'line') {
          if (handle.includes('n')) { newShape.y = shape.y + dy; newShape.height = shape.height - dy; }
          if (handle.includes('s')) { newShape.height = shape.height + dy; }
          if (handle.includes('w')) { newShape.x = shape.x + dx; newShape.width = shape.width - dx; }
          if (handle.includes('e')) { newShape.width = shape.width + dx; }
        }
        return newShape;
      }));
    } else if (cropDragging && cropRect) {
      const ctx = overlayRef.current.getContext('2d');
      ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      
      let newRect = {...cropRect};
      
      if (cropDragging.type === 'create') {
        newRect.width = x - cropRect.x;
        newRect.height = y - cropRect.y;
        setCropRect(newRect);
      } else if (cropDragging.type === 'move') {
        const dx = x - cropDragging.startX;
        const dy = y - cropDragging.startY;
        newRect.x = cropDragging.origRect.x + dx;
        newRect.y = cropDragging.origRect.y + dy;
        setCropRect(newRect);
      } else if (cropDragging.type === 'resize') {
        const dx = x - cropDragging.startX;
        const dy = y - cropDragging.startY;
        const orig = cropDragging.origRect;
        const h = cropDragging.handle;
        
        if (h.includes('n')) { newRect.y = orig.y + dy; newRect.height = orig.height - dy; }
        if (h.includes('s')) { newRect.height = orig.height + dy; }
        if (h.includes('w')) { newRect.x = orig.x + dx; newRect.width = orig.width - dx; }
        if (h.includes('e')) { newRect.width = orig.width + dx; }
        setCropRect(newRect);
      }
      
      ctx.strokeStyle = '#25D366';
      ctx.lineWidth = 2;
      ctx.strokeRect(newRect.x, newRect.y, newRect.width, newRect.height);
      
      // Grid
      ctx.strokeStyle = 'rgba(37, 211, 102, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(newRect.x + (newRect.width / 3) * i, newRect.y);
        ctx.lineTo(newRect.x + (newRect.width / 3) * i, newRect.y + newRect.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(newRect.x, newRect.y + (newRect.height / 3) * i);
        ctx.lineTo(newRect.x + newRect.width, newRect.y + (newRect.height / 3) * i);
        ctx.stroke();
      }
      
      // Draw resize handles (larger for touch devices)
      const handleSize = 12;
      const handles = [
        [newRect.x, newRect.y], [newRect.x + newRect.width/2, newRect.y], [newRect.x + newRect.width, newRect.y],
        [newRect.x, newRect.y + newRect.height/2], [newRect.x + newRect.width, newRect.y + newRect.height/2],
        [newRect.x, newRect.y + newRect.height], [newRect.x + newRect.width/2, newRect.y + newRect.height], [newRect.x + newRect.width, newRect.y + newRect.height]
      ];
      handles.forEach(([hx, hy]) => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
        ctx.strokeStyle = '#25D366';
        ctx.lineWidth = 2;
        ctx.strokeRect(hx - handleSize/2, hy - handleSize/2, handleSize, handleSize);
      });
    } else if (isDrawing && activeTool === 'draw') {
      const ctx = overlayRef.current.getContext('2d');
      ctx.lineTo(x, y);
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = drawSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const endInteraction = () => {
    setShowAlignmentGrid(false);
    setCenterSnap({ x: false, y: false });
    
    if (textDragging) {
      setTextDragging(false);
      saveToHistory();
    } else if (resizingText) {
      setResizingText(null);
      saveToHistory();
    } else if (resizingShape) {
      setResizingShape(null);
      saveToHistory();
    } else if (shapeDragging && selectedShape !== null && !isDrawing) {
      setShapeDragging(false);
      saveToHistory();
    } else if (cropDragging) {
      setCropDragging(null);
    } else if (isDrawing && activeTool === 'draw') {
      const mainCtx = canvasRef.current.getContext('2d');
      mainCtx.drawImage(overlayRef.current, 0, 0);
      const overlayCtx = overlayRef.current.getContext('2d');
      overlayCtx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      setIsDrawing(false);
      const img = new Image();
      img.onload = () => {
        setImage(img);
        saveToHistory();
      };
      img.src = canvasRef.current.toDataURL();
    }
  };

  const applyCrop = () => {
    if (!cropRect) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const x = Math.min(cropRect.x, cropRect.x + cropRect.width);
    const y = Math.min(cropRect.y, cropRect.y + cropRect.height);
    const w = Math.abs(cropRect.width);
    const h = Math.abs(cropRect.height);
    
    // Create temp canvas with only base image (no objects)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    
    // Redraw only the base image without objects
    const scale = canvas.width / image.width;
    tempCtx.save();
    tempCtx.filter = `brightness(${100 + brightness}%) contrast(${100 + contrast}%) saturate(${100 + saturation}%)`;
    tempCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
    tempCtx.restore();
    
    if (filter !== 'none') {
      const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (filter === 'bw') {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        } else if (filter === 'sepia') {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
          data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
          data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
        } else if (filter === 'invert') {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
      }
      tempCtx.putImageData(imageData, 0, 0);
    }
    
    // Crop the base image
    const croppedData = tempCtx.getImageData(x, y, w, h);
    canvas.width = w;
    canvas.height = h;
    ctx.putImageData(croppedData, 0, 0);
    
    // Adjust object positions relative to crop
    const scaleX = w / canvas.width;
    const scaleY = h / canvas.height;
    setTexts(prev => prev.map(t => ({
      ...t,
      x: t.x - x,
      y: t.y - y
    })).filter(t => t.x >= 0 && t.x <= w && t.y >= 0 && t.y <= h));
    
    setShapes(prev => prev.map(s => ({
      ...s,
      x: s.x - x,
      y: s.y - y
    })).filter(s => s.x >= -100 && s.x <= w + 100 && s.y >= -100 && s.y <= h + 100));
    
    const img = new Image();
    img.onload = () => {
      setImage(img);
      drawCanvas(img);
    };
    img.src = canvas.toDataURL();
    
    setCropRect(null);
    overlayRef.current.getContext('2d').clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
    saveToHistory();
    setActiveTool(null);
  };

  const confirmTextInput = () => {
    if (textInputValue.trim()) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.font = `bold 32px Arial`;
      const metrics = ctx.measureText(textInputValue);
      setTexts(prev => [...prev, {
        content: textInputValue,
        x: textInputPos.x,
        y: textInputPos.y,
        width: metrics.width,
        height: 32,
        color: '#FFFFFF',
        size: 32,
        rotation: 0
      }]);
      saveToHistory();
    }
    setShowTextInput(false);
    setTextInputValue('');
  };

  const deleteSelected = () => {
    if (selectedText !== null) {
      setTexts(prev => prev.filter((_, i) => i !== selectedText));
      setSelectedText(null);
      saveToHistory();
    } else if (selectedShape !== null) {
      setShapes(prev => prev.filter((_, i) => i !== selectedShape));
      setSelectedShape(null);
      saveToHistory();
    }
  };

  const updateSelectedText = (updates) => {
    if (selectedText !== null) {
      setTexts(prev => prev.map((t, i) => i === selectedText ? { ...t, ...updates } : t));
    }
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    setActiveTool(null);
    setSelectedText(null);
    setSelectedShape(null);
    const dataURL = canvasRef.current.toDataURL('image/jpeg', 0.95);
    const editState = { brightness, contrast, saturation, rotation, flipH, flipV, filter, texts, shapes };
    onSave(dataURL, editState, caption);
  };

  return (
    <div className="absolute inset-0 bg-white dark:bg-gray-900 z-40 flex flex-col" style={{ top: '64px' }}>
      {/* Glass Toolbar - Responsive */}
      <div className={`absolute top-2 sm:top-4 z-20 transition-all duration-300 ${
        showAccessories 
          ? 'left-2 right-2 sm:left-4 sm:right-4 md:right-[340px]' 
          : 'left-2 right-2 sm:left-4 sm:right-4 lg:left-8 lg:right-8 xl:left-16 xl:right-16'
      }`}>
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 py-2 bg-gray-900/60 dark:bg-black/50 backdrop-blur-md rounded-2xl border border-gray-700/50 dark:border-white/30 shadow-lg">
          <button onClick={onCancel} className="p-2 text-white hover:text-gray-200 transition flex-shrink-0">
            <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="w-px h-5 sm:h-6 bg-white/40 mx-1 flex-shrink-0"></div>
          <button onClick={() => handleToolClick('crop')} className={`p-2 rounded-lg transition flex-shrink-0 ${activeTool === 'crop' ? 'bg-white/30 text-white' : 'text-white hover:text-gray-200 hover:bg-white/20'}`}>
            <FiCrop className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => handleToolClick('adjust')} className={`p-2 rounded-lg transition flex-shrink-0 ${activeTool === 'adjust' ? 'bg-white/30 text-white' : 'text-white hover:text-gray-200 hover:bg-white/20'}`}>
            <FiSliders className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => handleToolClick('draw')} className={`p-2 rounded-lg transition flex-shrink-0 ${activeTool === 'draw' ? 'bg-white/30 text-white' : 'text-white hover:text-gray-200 hover:bg-white/20'}`}>
            <FiEdit3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => handleToolClick('text')} className={`p-2 rounded-lg transition flex-shrink-0 ${activeTool === 'text' ? 'bg-white/30 text-white' : 'text-white hover:text-gray-200 hover:bg-white/20'}`}>
            <FiType className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => handleToolClick('shape')} className={`p-2 rounded-lg transition flex-shrink-0 ${activeTool === 'shape' ? 'bg-white/30 text-white' : 'text-white hover:text-gray-200 hover:bg-white/20'}`}>
            <FiSquare className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => handleToolClick('filter')} className={`p-2 rounded-lg transition flex-shrink-0 ${activeTool === 'filter' ? 'bg-white/30 text-white' : 'text-white hover:text-gray-200 hover:bg-white/20'}`}>
            <FiFilter className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="w-px h-5 sm:h-6 bg-white/40 mx-1 flex-shrink-0"></div>
          <button onClick={() => { rotateImage(); saveToHistory(); }} className="p-2 text-white hover:text-gray-200 hover:bg-white/20 rounded-lg transition flex-shrink-0">
            <FiRotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={() => { flipImage(); saveToHistory(); }} className="p-2 text-white hover:text-gray-200 hover:bg-white/20 rounded-lg transition flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          <button onClick={undo} disabled={historyIndex <= 0} className="p-2 text-white hover:text-gray-200 hover:bg-white/20 rounded-lg transition disabled:opacity-30 flex-shrink-0">
            <FiRotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 text-white hover:text-gray-200 hover:bg-white/20 rounded-lg transition disabled:opacity-30 flex-shrink-0">
            <FiRotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Image Container */}
        <div className={`flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
          showAccessories ? 'w-full md:w-[75%]' : 'w-full'
        } h-full`}>
          {loading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Processing...</p>
              </div>
            </div>
          )}

          {!loading && (
            <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
              <div className="relative">
                <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
                <canvas 
                  ref={overlayRef}
                  className="absolute top-0 left-0 w-full h-full touch-none"
                onMouseDown={startInteraction}
                onMouseMove={moveInteraction}
                onMouseUp={endInteraction}
                onMouseLeave={endInteraction}
                onTouchStart={startInteraction}
                onTouchMove={moveInteraction}
                onTouchEnd={endInteraction}
              />
              {showAlignmentGrid && canvasRef.current && (
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ width: canvasRef.current.width, height: canvasRef.current.height }}>
                  <line x1="33.33%" y1="0" x2="33.33%" y2="100%" stroke="rgba(37, 211, 102, 0.3)" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="66.66%" y1="0" x2="66.66%" y2="100%" stroke="rgba(37, 211, 102, 0.3)" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="33.33%" x2="100%" y2="33.33%" stroke="rgba(37, 211, 102, 0.3)" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="0" y1="66.66%" x2="100%" y2="66.66%" stroke="rgba(37, 211, 102, 0.3)" strokeWidth="1" strokeDasharray="5,5" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke={centerSnap.x ? "rgba(255, 0, 102, 0.8)" : "rgba(37, 211, 102, 0.4)"} strokeWidth={centerSnap.x ? "2" : "1"} strokeDasharray="5,5" />
                  <line x1="0" y1="50%" x2="100%" y2="50%" stroke={centerSnap.y ? "rgba(255, 0, 102, 0.8)" : "rgba(37, 211, 102, 0.4)"} strokeWidth={centerSnap.y ? "2" : "1"} strokeDasharray="5,5" />
                </svg>
              )}
              {showTextInput && (
                <div className="absolute" style={{ left: textInputPos.x, top: textInputPos.y, transform: 'translate(-50%, -50%)' }}>
                  <input
                    type="text"
                    value={textInputValue}
                    onChange={(e) => setTextInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && confirmTextInput()}
                    autoFocus
                    className="px-3 py-2 bg-white text-black rounded border-2 border-green-500 focus:outline-none"
                    placeholder="Enter text..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={confirmTextInput} className="flex-1 px-3 py-1 bg-green-500 text-white rounded text-sm">Add</button>
                    <button onClick={() => setShowTextInput(false)} className="flex-1 px-3 py-1 bg-gray-600 text-white rounded text-sm">Cancel</button>
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Tool Panel - Slide from bottom */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 transition-transform duration-300 z-30 ${showAccessories ? 'translate-y-0' : 'translate-y-full'}`} style={{ height: '240px' }}>
          <div className="p-4 max-h-80 overflow-y-auto">
            {effectiveTool === 'adjust' && (
              <div className="space-y-4">
                <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Adjust Image</h3>
                <div>
                  <label className="text-gray-900 dark:text-white text-sm mb-2 block">Brightness: {brightness}</label>
                  <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-green-500" />
                </div>
                <div>
                  <label className="text-gray-900 dark:text-white text-sm mb-2 block">Contrast: {contrast}</label>
                  <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-green-500" />
                </div>
                <div>
                  <label className="text-gray-900 dark:text-white text-sm mb-2 block">Saturation: {saturation}</label>
                  <input type="range" min="-100" max="100" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-green-500" />
                </div>
                <button onClick={() => { setBrightness(0); setContrast(0); setSaturation(0); saveToHistory(); }} className="w-full px-4 py-2 bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition">
                  Reset All
                </button>
              </div>
            )}
            
            {effectiveTool === 'draw' && (
              <div className="space-y-4">
                <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Draw Tool</h3>
                <div>
                  <label className="text-gray-900 dark:text-white text-sm mb-3 block">Color</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer" />
                    <span className="text-gray-600 dark:text-gray-400 text-xs">{drawColor.toUpperCase()}</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {colors.map(c => (
                      <button key={c} onClick={() => setDrawColor(c)} className={`w-10 h-10 rounded-lg border-2 transition ${drawColor === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-gray-900 dark:text-white text-sm mb-2 block">Brush Size: {drawSize}px</label>
                  <input type="range" min="1" max="20" value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} className="w-full accent-green-500" />
                </div>
              </div>
            )}
            
            {effectiveTool === 'shape' && (
              <div className="space-y-4">
                <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Shape Tool</h3>
                {selectedShape === null ? (
                  <>
                    <div>
                      <label className="text-gray-900 dark:text-white text-sm mb-3 block">Select Shape</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                        <button onClick={() => setShapeType('square')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'square' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                          <div className="w-10 h-10 border-2 border-gray-900 dark:border-white mx-auto"></div>
                          <p className="text-gray-900 dark:text-white text-xs mt-2">Square</p>
                        </button>
                        <button onClick={() => setShapeType('circle')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'circle' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                          <div className="w-10 h-10 border-2 border-gray-900 dark:border-white rounded-full mx-auto"></div>
                          <p className="text-gray-900 dark:text-white text-xs mt-2">Circle</p>
                        </button>
                        <button onClick={() => setShapeType('arrow')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'arrow' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                          <div className="text-gray-900 dark:text-white text-2xl">→</div>
                          <p className="text-gray-900 dark:text-white text-xs mt-2">Arrow</p>
                        </button>
                        <button onClick={() => setShapeType('line')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'line' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                          <div className="w-10 h-0 border-t-2 border-gray-900 dark:border-white mx-auto mt-5"></div>
                          <p className="text-gray-900 dark:text-white text-xs mt-2">Line</p>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-900 dark:text-white text-sm mb-3 block">Color</label>
                      <div className="flex items-center gap-2 mb-2">
                        <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer" />
                        <span className="text-gray-600 dark:text-gray-400 text-xs">{shapeColor.toUpperCase()}</span>
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        {colors.map(c => (
                          <button key={c} onClick={() => setShapeColor(c)} className={`w-10 h-10 rounded-lg border-2 transition ${shapeColor === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Click on image to add {shapeType}</p>
                  </>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-900 dark:text-white text-sm mb-2">Edit Selected Shape</p>
                    <div>
                      <label className="text-gray-900 dark:text-white text-sm mb-3 block">Change Color</label>
                      <div className="grid grid-cols-6 gap-2">
                        {colors.map(c => (
                          <button key={c} onClick={() => setShapes(prev => prev.map((s, i) => i === selectedShape ? { ...s, color: c } : s))} className={`w-10 h-10 rounded-lg border-2 transition ${shapes[selectedShape]?.color === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <button onClick={deleteSelected} className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                      <FiTrash2 className="inline mr-2" /> Delete Shape
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {effectiveTool === 'filter' && (
              <div className="space-y-4">
                <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Filters</h3>
                <div className="grid grid-cols-2 gap-3">
                  {filters.map(f => (
                    <button key={f.id} onClick={() => { setFilter(f.id); saveToHistory(); }} className={`px-4 py-3 rounded-lg transition ${filter === f.id ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {effectiveTool === 'text' && (
              <div className="space-y-4">
                <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Text Tool</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Click on image to add text</p>
                {selectedText !== null && (
                  <div className="space-y-3">
                    <p className="text-gray-900 dark:text-white text-sm mb-2">Edit Selected Text</p>
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map(c => (
                        <button key={c} onClick={() => updateSelectedText({ color: c })} className={`w-10 h-10 rounded-lg border-2 transition ${texts[selectedText]?.color === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    <div>
                      <label className="text-gray-900 dark:text-white text-sm mb-2 block">Font Size: {texts[selectedText]?.size}px</label>
                      <input type="number" min="8" max="200" value={texts[selectedText]?.size || 32} onChange={(e) => updateSelectedText({ size: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    <div>
                      <label className="text-gray-900 dark:text-white text-sm mb-2 block">Rotation: {texts[selectedText]?.rotation || 0}°</label>
                      <input type="range" min="0" max="360" value={texts[selectedText]?.rotation || 0} onChange={(e) => updateSelectedText({ rotation: Number(e.target.value) })} className="w-full accent-green-500" />
                    </div>
                    <button onClick={deleteSelected} className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                      <FiTrash2 className="inline mr-2" /> Delete Text
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {effectiveTool === 'crop' && (
              <div className="space-y-4">
                <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Crop Image</h3>
                {(!cropRect || Math.abs(cropRect.width) <= 10 || Math.abs(cropRect.height) <= 10) && (
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Click and drag on image to select area
                  </p>
                )}
                {cropRect && Math.abs(cropRect.width) > 10 && Math.abs(cropRect.height) > 10 && (
                  <div className="space-y-3">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Drag to adjust crop area
                    </p>
                    <button onClick={applyCrop} className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition">
                      <FiCheck className="inline mr-2" /> Apply Crop
                    </button>
                    <button onClick={() => { setCropRect(null); overlayRef.current.getContext('2d').clearRect(0, 0, overlayRef.current.width, overlayRef.current.height); }} className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition">
                      <FiX className="inline mr-2" /> Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Tool Panel - Slide from right */}
        <div className={`hidden md:flex absolute right-0 top-0 bottom-0 w-[25%] bg-gray-50 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-600 flex-col transition-transform duration-300 z-30 ${showAccessories ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-4 lg:p-6 overflow-y-auto flex-1 text-sm lg:text-base">
              {effectiveTool === 'adjust' && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Adjust Image</h3>
                  <div>
                    <label className="text-gray-900 dark:text-white text-sm mb-2 block">Brightness: {brightness}</label>
                    <input type="range" min="-100" max="100" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} className="w-full accent-green-500" />
                  </div>
                  <div>
                    <label className="text-gray-900 dark:text-white text-sm mb-2 block">Contrast: {contrast}</label>
                    <input type="range" min="-100" max="100" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} className="w-full accent-green-500" />
                  </div>
                  <div>
                    <label className="text-gray-900 dark:text-white text-sm mb-2 block">Saturation: {saturation}</label>
                    <input type="range" min="-100" max="100" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))} className="w-full accent-green-500" />
                  </div>
                  <button onClick={() => { setBrightness(0); setContrast(0); setSaturation(0); saveToHistory(); }} className="w-full px-4 py-2 bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition">
                    Reset All
                  </button>
                </div>
              )}
              
              {effectiveTool === 'draw' && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Draw Tool</h3>
                  <div>
                    <label className="text-gray-900 dark:text-white text-sm mb-3 block">Color</label>
                    <div className="flex items-center gap-2 mb-2">
                      <input type="color" value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer" />
                      <span className="text-gray-600 dark:text-gray-400 text-xs">{drawColor.toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {colors.map(c => (
                        <button key={c} onClick={() => setDrawColor(c)} className={`w-10 h-10 rounded-lg border-2 transition ${drawColor === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-900 dark:text-white text-sm mb-2 block">Brush Size: {drawSize}px</label>
                    <input type="range" min="1" max="20" value={drawSize} onChange={(e) => setDrawSize(Number(e.target.value))} className="w-full accent-green-500" />
                  </div>
                </div>
              )}
              
              {effectiveTool === 'shape' && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Shape Tool</h3>
                  {selectedShape === null ? (
                    <>
                      <div>
                        <label className="text-gray-900 dark:text-white text-sm mb-3 block">Select Shape</label>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <button onClick={() => setShapeType('square')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'square' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                            <div className="w-10 h-10 border-2 border-gray-900 dark:border-white mx-auto"></div>
                            <p className="text-gray-900 dark:text-white text-xs mt-2">Square</p>
                          </button>
                          <button onClick={() => setShapeType('circle')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'circle' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                            <div className="w-10 h-10 border-2 border-gray-900 dark:border-white rounded-full mx-auto"></div>
                            <p className="text-gray-900 dark:text-white text-xs mt-2">Circle</p>
                          </button>
                          <button onClick={() => setShapeType('arrow')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'arrow' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                            <div className="text-gray-900 dark:text-white text-2xl">→</div>
                            <p className="text-gray-900 dark:text-white text-xs mt-2">Arrow</p>
                          </button>
                          <button onClick={() => setShapeType('line')} className={`p-3 rounded-lg border-2 transition ${shapeType === 'line' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}`}>
                            <div className="w-10 h-0 border-t-2 border-gray-900 dark:border-white mx-auto mt-5"></div>
                            <p className="text-gray-900 dark:text-white text-xs mt-2">Line</p>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-gray-900 dark:text-white text-sm mb-3 block">Color</label>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} className="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer" />
                          <span className="text-gray-600 dark:text-gray-400 text-xs">{shapeColor.toUpperCase()}</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {colors.map(c => (
                            <button key={c} onClick={() => setShapeColor(c)} className={`w-10 h-10 rounded-lg border-2 transition ${shapeColor === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">Click on image to add {shapeType}</p>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-gray-900 dark:text-white text-sm mb-2">Edit Selected Shape</p>
                      <div>
                        <label className="text-gray-900 dark:text-white text-sm mb-3 block">Change Color</label>
                        <div className="grid grid-cols-6 gap-2">
                          {colors.map(c => (
                            <button key={c} onClick={() => setShapes(prev => prev.map((s, i) => i === selectedShape ? { ...s, color: c } : s))} className={`w-10 h-10 rounded-lg border-2 transition ${shapes[selectedShape]?.color === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                      <button onClick={deleteSelected} className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                        <FiTrash2 className="inline mr-2" /> Delete Shape
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {effectiveTool === 'filter' && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Filters</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {filters.map(f => (
                      <button key={f.id} onClick={() => { setFilter(f.id); saveToHistory(); }} className={`px-4 py-3 rounded-lg transition ${filter === f.id ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {effectiveTool === 'text' && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Text Tool</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Click on image to add text</p>
                  {selectedText !== null && (
                    <div className="space-y-3">
                      <p className="text-gray-900 dark:text-white text-sm mb-2">Edit Selected Text</p>
                      <div className="grid grid-cols-6 gap-2">
                        {colors.map(c => (
                          <button key={c} onClick={() => updateSelectedText({ color: c })} className={`w-10 h-10 rounded-lg border-2 transition ${texts[selectedText]?.color === c ? 'border-green-400 scale-110' : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`} style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div>
                        <label className="text-gray-900 dark:text-white text-sm mb-2 block">Font Size: {texts[selectedText]?.size}px</label>
                        <input type="number" min="8" max="200" value={texts[selectedText]?.size || 32} onChange={(e) => updateSelectedText({ size: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="text-gray-900 dark:text-white text-sm mb-2 block">Rotation: {texts[selectedText]?.rotation || 0}°</label>
                        <input type="range" min="0" max="360" value={texts[selectedText]?.rotation || 0} onChange={(e) => updateSelectedText({ rotation: Number(e.target.value) })} className="w-full accent-green-500" />
                      </div>
                      <button onClick={deleteSelected} className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition">
                        <FiTrash2 className="inline mr-2" /> Delete Text
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {effectiveTool === 'crop' && (
                <div className="space-y-4">
                  <h3 className="text-gray-900 dark:text-white text-lg font-medium mb-4">Crop Image</h3>
                  {(!cropRect || Math.abs(cropRect.width) <= 10 || Math.abs(cropRect.height) <= 10) && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Click and drag on image to select area
                    </p>
                  )}
                  {cropRect && Math.abs(cropRect.width) > 10 && Math.abs(cropRect.height) > 10 && (
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Drag to adjust crop area
                      </p>
                      <button onClick={applyCrop} className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition">
                        <FiCheck className="inline mr-2" /> Apply Crop
                      </button>
                      <button onClick={() => { setCropRect(null); overlayRef.current.getContext('2d').clearRect(0, 0, overlayRef.current.width, overlayRef.current.height); }} className="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition">
                        <FiX className="inline mr-2" /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Bottom Controls - Responsive Caption and Done Button */}
      {!activeTool && !loading && selectedText === null && selectedShape === null && (
        <div className="absolute bottom-2 sm:bottom-4 left-0 right-0 flex items-center gap-2 sm:gap-4 px-3 sm:px-6">
          <div className="flex-1">
            <div className="bg-gray-800/90 dark:bg-gray-700/90 backdrop-blur-md rounded-full border border-gray-600 dark:border-gray-500 p-1.5 sm:p-2">
              <input 
                type="text" 
                value={caption || ''} 
                onChange={(e) => onCaptionChange(e.target.value)} 
                placeholder="Add a caption..." 
                className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-transparent text-white placeholder-gray-300 focus:outline-none text-xs sm:text-sm" 
                maxLength={200} 
              />
            </div>
          </div>
          <button 
            onClick={handleSave} 
            disabled={loading} 
            className="w-10 h-10 sm:w-14 sm:h-14 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 flex-shrink-0"
          >
            <FiSend className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default BlogImageEditor;