import { useState, useEffect } from 'react';
import EditOwnerForm from './EditOwnerForm';

interface OwnerDetailsCardProps {
  owner: any;
  onClose: () => void;
  onRefresh: () => void; // Callback to reload parent data
  currentTotalPercentage?: number; // Passed from parent to calculate limits
}

const OwnerDetailsCard = ({ owner, onClose, onRefresh, currentTotalPercentage }: OwnerDetailsCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...owner });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset form data if the owner prop changes (e.g. after a refresh)
  useEffect(() => {
    setFormData({ ...owner });
  }, [owner]);

  // Auto-hide the success toast after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleUpdate = async () => {
    setErrorMessage(null); // Clear previous errors

    // --- 1. STRICT PERCENTAGE VALIDATION ---
    // Only run this check if currentTotalPercentage was passed (meaning it's a child being edited)
    if (currentTotalPercentage !== undefined) {
      const originalPct = parseFloat(String(owner.percentage || '0').replace('%', '')) || 0;
      const newPct = parseFloat(String(formData.percentage || '0').replace('%', '')) || 0;
      
      // Calculate what ALL OTHER children add up to
      const otherChildrenTotal = Math.max(0, currentTotalPercentage - originalPct);

      // BLOCK SUBMIT if the other children + the new percentage > 100
      if (otherChildrenTotal + newPct > 100) {
        const allowedMax = Math.max(0, 100 - otherChildrenTotal);
        setErrorMessage(`Total ownership cannot exceed 100%. Other owners currently hold ${otherChildrenTotal}%. You can only set this up to ${allowedMax}%.`);
        return; // <-- THIS STOPS THE SUBMIT
      }
    }
    // ---------------------------------------

    // 2. FIELD MAPPING
    const fieldMap: Record<string, string> = {
      firstName: "First Name",
      lastName: "Last Name",
      phone: "Business Phone",
      ownershipType: "Type",
      type: "Title",
      percentage: "Percent Owned",
      ownerName: "Entity Name",
      email: "E-mail",
      ownershipAddr: "Address Line 1",
      city: "City",
      state: "State",
      zip: "ZIP Code/Province Postal Code",
      fein: "FEIN", 
      ssn: "SSN"    
    };

    // 3. DETECT CHANGES (Build editArray)
    const editArray: any[] = [];
    const changesObject: any = {};

    Object.keys(formData).forEach((key) => {
      let currentValue = formData[key];
      const originalValue = owner[key];

      if (key === 'type') {
        currentValue = currentValue || "Owner";
      }

      // Checks if mapped AND value changed
      if (fieldMap[key] && currentValue != originalValue) {
        changesObject[fieldMap[key]] = currentValue || "";
      }
    });

    // Push the single object to the array ONLY if changes were found
    if (Object.keys(changesObject).length > 0) {
      editArray.push(changesObject);
    }

    if (editArray.length === 0) {
      alert("No changes detected.");
      return;
    }

    // 4. SEND TO BACKEND
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/edit-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // CRITICAL FIX: Send the array directly. Do NOT stringify it here.
          editArray: JSON.stringify(editArray), 
          editRefNbr: owner.refNbr || owner.referenceNbr || owner.id, 
          parentRefNbr: owner.parentRefNbr
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccessMessage(`Owner updated successfully`);
        setIsEditing(false);
        if (onRefresh) onRefresh();
      } else {
        console.error("Server Error:", result);
        alert(`Failed to update: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Network Error:", error);
      alert("Could not connect to the backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Only allow cancel if not currently saving
    if (!isLoading) {
      setFormData({ ...owner }); // Reset data to original
      setErrorMessage(null); // Clear errors on cancel
      setIsEditing(false);
    }
  };

  return (
    <>
      {/* FLOATING TOAST NOTIFICATION */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out">
          <div className="bg-green-600 text-white px-8 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center gap-4 border border-green-400">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-bold tracking-wide">{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="ml-4 text-white/70 hover:text-white text-xl font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* MODAL OVERLAY */}
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="bg-[#2c3e76] text-white px-6 py-4 flex-shrink-0">
            <h2 className="text-xl font-semibold tracking-wide">
              {isEditing ? "Edit Entity Details" : "Entity Details"}
            </h2>
          </div>

          {/* Validation Error Banner */}
          {errorMessage && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mx-6 mt-4 flex-shrink-0">
              <p className="text-red-700 font-medium">{errorMessage}</p>
            </div>
          )}

          <div className="overflow-y-auto">
            {isEditing ? (
              <EditOwnerForm 
                formData={formData} 
                setFormData={(data: any) => {
                  setFormData(data);
                  if (errorMessage) setErrorMessage(null); // Clear error as soon as user types
                }} 
                onCancel={handleCancel} 
                onUpdate={handleUpdate} 
                isLoading={isLoading}
              />
            ) : (
              <div className="p-10 bg-[#f0f4f8] space-y-10">
                {/* Row 1 */}
                <div className="grid grid-cols-3 gap-8">
                  <ViewField label="Ownership Type" value={formData.ownershipType} />
                  <ViewField label="Ownership Entity Name" value={formData.ownerName} />
                  <ViewField label="Type of Entity" value={formData.type || formData.contactType} />
                </div>

                {/* Row 2 */}
                <ViewField label="Ownership Address" value={formData.ownershipAddr || formData.contactAddress} />

                {/* Row 3 */}
                <div className="grid grid-cols-4 gap-8">
                  <ViewField label="Email" value={formData.email} />
                  <ViewField label="Phone Number" value={formData.phone} />
                  <ViewField label="FEIN" value={formData.fein} />
                  <ViewField label="SSN" value={formData.ssn} />
                </div>

                {/* Row 4 */}
                <ViewField label="Percent (%) Owned" value={formData.percentage ? `${formData.percentage}%` : "0%"} />

                {/* Buttons */}
                <div className="flex justify-end gap-5 pt-6">
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="px-14 py-2.5 border-2 border-[#2c3e76] text-[#2c3e76] font-bold rounded-md bg-white hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={onClose} 
                    className="px-16 py-2.5 bg-[#2c3e76] text-white font-bold rounded-md hover:bg-[#1e2a52] transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const ViewField = ({ label, value }: { label: string, value: any }) => (
  <section>
    <p className="text-gray-500 text-[15px] font-medium mb-2">{label}</p>
    <p className="font-bold text-gray-900 text-lg">
      {value || "N/A"}
    </p>
  </section>
);

export default OwnerDetailsCard;