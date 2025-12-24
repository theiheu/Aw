import { useEffect, useMemo, useState } from 'react';
import { Vehicle } from '../types';

/**
 * Quản lý profile xe theo biển số:
 * - Nếu tìm thấy xe: trả về defaultCustomer/defaultProduct
 * - Nếu không tìm thấy (plate >= minLen): bật trạng thái vehicleNotFound
 * - Không tự mở modal (UX: để UI cho user bấm "Tạo xe")
 */
export const useVehicleProfile = (params: {
  vehicles: Vehicle[];
  plateNumber: string;
  enabled: boolean; // formMode === 'new'
  minLen?: number;
}) => {
  const { vehicles, plateNumber, enabled, minLen = 3 } = params;

  const normalizedPlate = useMemo(() => plateNumber.trim(), [plateNumber]);

  const [vehicleNotFound, setVehicleNotFound] = useState(false);
  const [pendingPlate, setPendingPlate] = useState('');

  const matchedVehicle = useMemo(() => {
    if (!enabled) return undefined;
    if (normalizedPlate.length < minLen) return undefined;
    const p = normalizedPlate.toLowerCase();
    return vehicles.find((v) => v.plateNumber.toLowerCase() === p);
  }, [enabled, minLen, normalizedPlate, vehicles]);

  useEffect(() => {
    if (!enabled) {
      setVehicleNotFound(false);
      setPendingPlate('');
      return;
    }

    if (normalizedPlate.length < minLen) {
      setVehicleNotFound(false);
      setPendingPlate('');
      return;
    }

    if (matchedVehicle) {
      setVehicleNotFound(false);
      setPendingPlate('');
      return;
    }

    setVehicleNotFound(true);
    setPendingPlate(normalizedPlate);
  }, [enabled, matchedVehicle, minLen, normalizedPlate]);

  const resetNotFound = () => {
    setVehicleNotFound(false);
    setPendingPlate('');
  };

  return {
    matchedVehicle,
    autoCustomerName: matchedVehicle?.defaultCustomer || '',
    autoProductName: matchedVehicle?.defaultProduct || '',
    vehicleNotFound,
    pendingPlate,
    resetNotFound,
  };
};

