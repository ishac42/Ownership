import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import EditOwnerForm from './EditOwnerForm';

interface OwnerDetailsCardProps {
  owner: any;
  onClose: () => void;
  onRefresh: () => void;
  currentTotalPercentage?: number; 
  isFromList?: boolean;
}

const OwnerDetailsCard = ({ owner, onClose, onRefresh, currentTotalPercentage, isFromList }: OwnerDetailsCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...owner });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setFormData({ ...owner });
  }, [owner]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- FIX 1: Define variables at the component level so JSX can access them ---
  const isRootParent = !owner.parentRefNbr || owner.parentRefNbr === "" || owner.parentRefNbr === "0";
  const hasChildren = (owner.totalChildrenPercentage ?? 0) > 0;
  const shouldCalculateFromChildren = hasChildren && (isRootParent || isFromList);
  const originalPct = parseFloat(String(owner.percentage || '0').replace('%', '')) || 0;

  const handleUpdate = async () => {
    setErrorMessage(null);

    const finalPctValue = shouldCalculateFromChildren 
        ? owner.totalChildrenPercentage 
        : parseFloat(String(formData.percentage || '0').replace('%', '')) || 0;

    if (currentTotalPercentage !== undefined && !isRootParent) {
      const otherChildrenTotal = Math.max(0, currentTotalPercentage - originalPct);

      if (otherChildrenTotal + finalPctValue > 100) {
        const allowedMax = Math.max(0, 100 - otherChildrenTotal);
        setErrorMessage(`Total ownership cannot exceed 100%. Other owners currently hold ${otherChildrenTotal}%. You can only set this up to ${allowedMax}%.`);
        return;
      }
    }

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

    const editArray: any[] = [];
    const changesObject: any = {};

    Object.keys(formData).forEach((key) => {
      let currentValue = formData[key];
      const originalValue = owner[key];

      if (key === 'percentage' && shouldCalculateFromChildren) {
        currentValue = owner.totalChildrenPercentage;
      }

      if (key === 'type') {
        currentValue = currentValue || "Owner";
      }

      if (fieldMap[key] && currentValue != originalValue) {
        changesObject[fieldMap[key]] = currentValue || "";
      }
    });

    if (Object.keys(changesObject).length > 0) {
      editArray.push(changesObject);
    }

    if (editArray.length === 0) {
      alert("No changes detected.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/edit-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        alert(`Failed to update: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      alert("Could not connect to the backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setFormData({ ...owner });
      setErrorMessage(null);
      setIsEditing(false);
    }
  };

  return (
    <>
      {successMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-in-out">
          <div className="bg-green-600 text-white px-8 py-4 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex items-center gap-4 border border-green-400">
            <div className="bg-white/20 rounded-full p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-bold tracking-wide">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="ml-4 text-white/70 hover:text-white text-xl font-bold">×</button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="bg-[#2c3e76] text-white px-6 py-4 flex-shrink-0">
            <h2 className="text-xl font-semibold tracking-wide">
              {isEditing ? "Edit Entity Details" : "Entity Details"}
            </h2>
          </div>

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
                  if (errorMessage) setErrorMessage(null);
                }} 
                onCancel={handleCancel} 
                onUpdate={handleUpdate} 
                isLoading={isLoading}
                // --- FIX 2: Ensure these props match what EditOwnerForm expects ---
                totalChildrenPercentage={owner.totalChildrenPercentage || 0}
                isRoot={isRootParent} 
                currentTotalPercentage={currentTotalPercentage}
                originalPercentage={originalPct}
                isFromList={isFromList}
              />
            ) : (
              <div className="p-10 bg-[#f0f4f8] space-y-10">
                <div className="grid grid-cols-3 gap-8">
                  <ViewField label="Ownership Type" value={formData.ownershipType} />
                  <ViewField label="Ownership Entity Name" value={formData.ownerName} />
                  <ViewField label="Type of Entity" value={formData.type || formData.contactType} />
                </div>

                <ViewField 
                  label="Ownership Address" 
                  value={
                    [
                      formData.ownershipAddr || formData.contactAddress,
                      formData.city,
                      formData.state,
                      formData.zip
                    ]
                    .filter(Boolean) // Removes null, undefined, or empty strings
                    .join(' ')       // Joins them with a single space
                    || "N/A"         // Fallback if the entire address is empty
                  } 
                />
                <div className="grid grid-cols-4 gap-8">
                  <ViewField label="Email" value={formData.email} />
                  <ViewField label="Phone Number" value={formData.phone} />
                  <ViewField label="FEIN" value={formData.fein} />
                  <ViewField label="SSN" value={formData.ssn} />
                </div>

                <ViewField 
                  label="Percent (%) Owned" 
                  value={
                    shouldCalculateFromChildren ? (
                      <span className="flex flex-col">
                        <span className={owner.totalChildrenPercentage > 100 ? 'text-red-600' : 'text-[#24417a]'}>
                          {owner.totalChildrenPercentage}%
                        </span>
                        <span className="text-xs text-gray-400 font-normal mt-1">(Total sum of all owners)</span>
                      </span>
                    ) : (
                      formData.percentage ? `${formData.percentage}%` : "0%"
                    )
                  } 
                />

                <div className="flex justify-end gap-5 pt-6">
                  <button onClick={() => setIsEditing(true)} className="px-14 py-2.5 border-2 border-[#2c3e76] text-[#2c3e76] font-bold rounded-md bg-white hover:bg-gray-50 transition-colors">Edit</button>
                  <button onClick={onClose} className="px-16 py-2.5 bg-[#2c3e76] text-white font-bold rounded-md hover:bg-[#1e2a52] transition-colors">OK</button>
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
    <p className="font-bold text-gray-900 text-lg">{value || "N/A"}</p>
  </section>
);

export default OwnerDetailsCard;