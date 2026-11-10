import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X } from 'lucide-react';

export default function SignatureModal({ isOpen, onClose, onSave, title = "Tanda Tangan" }) {
    const sigCanvas = useRef(null);

    if (!isOpen) return null;

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    const save = () => {
        if (sigCanvas.current.isEmpty()) {
            alert('Silakan isi tanda tangan terlebih dahulu.');
            return;
        }
        // Returns a base64 encoded png
        const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        onSave(dataURL);
        // Clear after saving so it's fresh for next time
        clear();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-slate-50 flex-grow flex justify-center items-center">
                    <div className="bg-white border-2 border-dashed border-slate-300 rounded block w-full touch-none">
                        <SignatureCanvas
                            ref={sigCanvas}
                            canvasProps={{
                                className: 'w-full h-48 cursor-crosshair'
                            }}
                        />
                    </div>
                </div>

                <div className="px-4 py-3 border-t bg-slate-100 flex justify-end space-x-2">
                    <button
                        onClick={clear}
                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-medium transition-colors"
                    >
                        Clear
                    </button>
                    <button
                        onClick={save}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                    >
                        Save Signature
                    </button>
                </div>
            </div>
        </div>
    );
}
