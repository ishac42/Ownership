import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import EditOwnerForm from './EditOwnerForm';
import { callOwnershipPortalValidation } from '../utils/ownershipValidation';
import { usePortalParams } from '../context/PortalContext';
import ValidationBlockDialog from './ValidationBlockDialog';
import { useOwnershipStatus } from '../context/OwnershipStatusContext';
import { getOwnerReferenceNbr, hasInvalidOwnershipTotal, isOwnershipAsitRow, OWNER_STATUS_OPTIONS, type OwnerStatus } from '../utils/ownershipStatus';
import { buildSavedOwnerUpdates } from '../utils/ownershipTree';

interface OwnerDetailsCardProps {
  owner: any;
  onClose: () => void;
  onRefresh?: () => void | Promise<void>;
  onOwnerUpdated?: (refNbr: string, updates: Record<string, unknown>) => void;
  currentTotalPercentage?: number; 
  isFromList?: boolean;
}

const OwnerDetailsCard = ({ owner, onClose, onRefresh, onOwnerUpdated, currentTotalPercentage, isFromList }: OwnerDetailsCardProps) => {
  const { recordID } = usePortalParams();
  const { getEffectiveStatus, setStatusOverride } = useOwnershipStatus();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...owner, status: getEffectiveStatus(owner) });
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [blockDialog, setBlockDialog] = useState<{ message: string; title?: string } | null>(null);

  const ownerRefNbr = getOwnerReferenceNbr(owner);

  useEffect(() => {
    if (isEditing) return;
    setFormData({ ...owner, status: getEffectiveStatus(owner) });
  }, [ownerRefNbr, owner, getEffectiveStatus, isEditing]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // --- FIX 1: Define variables at the component level so JSX can access them ---
  const isIndividualOwner = (formData.ownershipType || "").toLowerCase().includes('individual');
  const isRootParent = !owner.parentRefNbr || owner.parentRefNbr === "" || owner.parentRefNbr === "0";
  const hasChildren = (owner.totalChildrenPercentage ?? 0) > 0;
  const shouldCalculateFromChildren = hasChildren && (isRootParent || isFromList);
  const originalPct = parseFloat(String(owner.percentage || '0').replace('%', '')) || 0;
  const showStatusField = isOwnershipAsitRow(owner);

  const handleUpdate = async () => {
    setBlockDialog(null);

    const fieldMap: Record<string, string> = {
      // Core
      ownershipType: "Type",
      type: "Title",
      percentage: "Percent Owned",
      // Name
      ownerName: "Entity Name",
      nameTitle: "Name Prefix",
      firstName: "First Name",
      middleInitial: "Middle Name",
      lastName: "Last Name",
      suffix: "Name Suffix",
      resortHotel: "Resort Hotel",
      // Address
      addressType: "Address Type",
      locationName: "Location Name",
      attentionName: "Attention Name",
      attentionLine1: "Attention Name",
      optAddrLine: "Address Line 2",
      unitType: "Unit Type",
      unitNumber: "Unit Number",
      ownershipAddr: "Address Line 1",
      city: "City",
      country: "Country",
      state: "State",
      zip: "ZIP Code/Province Postal Code",
      // Contact
      phone: "Business Phone",
      faxNumber: "Fax Number",
      cellPhone: "Cell Phone",
      pagerNumber: "Pager Number",
      email: "E-mail",
      webPage: "Web Page",
      // Licenses / identifiers
      fein: "FEIN",
      ssn: "SSN",
      stateLicenseNumber: "State License Number",
      stateSalesTaxNumber: "State Sales Tax Number",
      professionalLicenseType: "Professional License Type",
      profLicenseNumber: "Professional License Number",
      professionalType: "Professional License Type",
      professionalLicNumber: "Professional License Number",
      otherLicenseType: "Other License Type",
      otherLicenseNumber: "Other License Number",
      driversLicense: "Drivers License Number",
      driversLicenseState: "Drivers License State",
      // Individual demographics
      dob: "Date of Birth",
      gender: "Gender",
      usCitizen: "US Citizen",
      // Descriptions / notes
      businessDescription: "Business Description",
      locationDescription: "Location Description",
      comments: "Comments",
      status: "Status",
    };

    const editArray: any[] = [];
    const changesObject: any = {};
    const originalStatus = getEffectiveStatus(owner);
    const newStatus = (formData.status || 'Active') as OwnerStatus;
    const statusChanged = newStatus !== originalStatus;

    Object.keys(formData).forEach((key) => {
      let currentValue = formData[key];
      let originalValue = owner[key];

      if (key === 'status') {
        originalValue = originalStatus;
      }

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

    if (editArray.length === 0 && !statusChanged) {
      setBlockDialog({ title: 'No Changes', message: 'No changes detected.' });
      return;
    }

    if (statusChanged) {
      const refNbr = getOwnerReferenceNbr(owner);
      if (refNbr && OWNER_STATUS_OPTIONS.includes(newStatus)) {
        setStatusOverride(refNbr, newStatus);
      }
    }

    if (editArray.length === 0) {
      const refNbr = getOwnerReferenceNbr(owner);
      const savedUpdates = buildSavedOwnerUpdates(formData, newStatus);
      setFormData(savedUpdates);
      if (refNbr) onOwnerUpdated?.(refNbr, savedUpdates);
      setSuccessMessage('Status updated successfully');
      setIsEditing(false);
      return;
    }

    setIsLoading(true);

    try {
      const validation = await callOwnershipPortalValidation(formData, recordID);
      if (validation.blocked) {
        if (validation.message) {
          setBlockDialog({ message: validation.message });
        }
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/edit-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editArray: JSON.stringify(editArray), 
          editRefNbr: getOwnerReferenceNbr(owner), 
          parentRefNbr: owner.parentRefNbr
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const refNbr = getOwnerReferenceNbr(owner);
        const newStatus = formData.status as OwnerStatus;
        if (refNbr && OWNER_STATUS_OPTIONS.includes(newStatus)) {
          setStatusOverride(refNbr, newStatus);
        }

        const savedUpdates = buildSavedOwnerUpdates(formData, newStatus);
        setFormData(savedUpdates);
        if (refNbr) onOwnerUpdated?.(refNbr, savedUpdates);

        setSuccessMessage(`Owner updated successfully`);
        setIsEditing(false);
        void onRefresh?.();
      } else {
        setBlockDialog({
          title: 'Update Failed',
          message: `Failed to update: ${result.error || 'Unknown error'}`,
        });
      }
    } catch (error) {
      setBlockDialog({
        title: 'Connection Error',
        message: 'Could not connect to the backend server.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      setFormData({ ...owner, status: getEffectiveStatus(owner) });
      setBlockDialog(null);
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

          <div className="overflow-y-auto">
            {isEditing ? (
              <EditOwnerForm 
                formData={formData} 
                setFormData={(data: any) => {
                  setFormData(data);
                  if (blockDialog) setBlockDialog(null);
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
                showStatusField={showStatusField}
              />
            ) : (
              <div className="p-10 bg-[#f0f4f8] space-y-8">
                <div className="grid grid-cols-3 gap-8">
                  <ViewField label="Ownership Type" value={formData.ownershipType} />
                  <ViewField
                    label={isIndividualOwner ? "Name" : "Business Name"}
                    value={
                      isIndividualOwner
                        ? [formData.nameTitle, formData.firstName, formData.middleInitial, formData.lastName, formData.suffix].filter(Boolean).join(' ')
                        : formData.ownerName
                    }
                  />
                  <ViewField label={isIndividualOwner ? "Type of Entity" : "Business Type"} value={formData.type || formData.contactType} />
                </div>

                {showStatusField && (
                  <ViewField label="Status" value={getEffectiveStatus(formData)} />
                )}

                <ViewField 
                  label="Address" 
                  value={
                    [
                      formData.unitType,
                      formData.unitNumber,
                      formData.ownershipAddr || formData.contactAddress,
                      formData.city,
                      formData.state,
                      formData.zip,
                      formData.country
                    ]
                    .filter(Boolean)
                    .join(' ')
                    || "N/A"
                  } 
                />

                <div className="grid grid-cols-4 gap-8">
                  <ViewField label="Email" value={formData.email} />
                  <ViewField label="Phone Number" value={formData.phone} />
                  <ViewField label={isIndividualOwner ? "Fax Number" : "FAX Number"} value={formData.faxNumber} />
                  <ViewField label={isIndividualOwner ? "Cell Number" : "Cell Phone #"} value={formData.cellPhone} />
                </div>

                {isIndividualOwner ? (
                  <>
                    <div className="grid grid-cols-4 gap-8">
                      <ViewField label="DOB" value={formData.dob} />
                      <ViewField label="Gender" value={formData.gender} />
                      <ViewField label="U.S. Citizen" value={formData.usCitizen} />
                      <ViewField label="Pager Number" value={formData.pagerNumber} />
                    </div>
                    <div className="grid grid-cols-4 gap-8">
                      <ViewField label="Driver's License" value={formData.driversLicense} />
                      <ViewField label="License State" value={formData.driversLicenseState} />
                      <ViewField label="Professional Type" value={formData.professionalType} />
                      <ViewField label="Professional Lic. #" value={formData.professionalLicNumber} />
                    </div>
                    <div className="grid grid-cols-4 gap-8">
                      <ViewField label="Other License Type" value={formData.otherLicenseType} />
                      <ViewField label="Other License Number" value={formData.otherLicenseNumber} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-8">
                      <ViewField label="FEIN" value={formData.fein} />
                      <ViewField label="State License Number" value={formData.stateLicenseNumber} />
                      <ViewField label="State Sales Tax Number" value={formData.stateSalesTaxNumber} />
                      <ViewField label="Web Page" value={formData.webPage} />
                    </div>
                    <div className="grid grid-cols-4 gap-8">
                      <ViewField label="Professional License Type" value={formData.professionalLicenseType} />
                      <ViewField label="Prof License #" value={formData.profLicenseNumber} />
                      <ViewField label="Resort Hotel" value={formData.resortHotel && formData.resortHotel !== 'N' ? 'Yes' : 'No'} />
                    </div>
                    {(formData.businessDescription || formData.locationDescription) && (
                      <div className="grid grid-cols-2 gap-8">
                        <ViewField label="Business Description" value={formData.businessDescription} />
                        <ViewField label="Location Description" value={formData.locationDescription} />
                      </div>
                    )}
                  </>
                )}

                {formData.comments && <ViewField label="Comments" value={formData.comments} />}

                <ViewField 
                  label="Percent (%) Owned" 
                  value={
                    shouldCalculateFromChildren ? (
                      <span className="flex flex-col">
                        <span className={hasInvalidOwnershipTotal(owner.totalChildrenPercentage) ? 'text-red-600' : 'text-[#24417a]'}>
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

      {blockDialog && (
        <ValidationBlockDialog
          message={blockDialog.message}
          title={blockDialog.title}
          onDismiss={() => setBlockDialog(null)}
        />
      )}
    </>
  );
};

const ViewField = ({ label, value }: { label: string, value: any }) => (
  <section>
    <p className="text-gray-500 text-[15px] font-medium mb-2">{label}</p>
    <p className="font-bold text-gray-900 text-lg break-words whitespace-normal">{value || "N/A"}</p>
  </section>
);

export default OwnerDetailsCard;