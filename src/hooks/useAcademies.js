import { useCallback, useEffect } from 'react';
import {
  addAcademyAdmin,
  addStaff,
  addStudent,
  createAcademy,
  deleteAcademy,
  listAcademies,
} from '../services/academiesApi';
import { useAsyncState } from './useAsyncState';

export function useAcademies() {
  const { data, setData, loading, error, setError, run } = useAsyncState([]);

  const refresh = useCallback(async () => {
    await run(() => listAcademies());
  }, [run]);

  const create = useCallback(
    async (payload) => {
      await createAcademy(payload);
      return refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (academyId) => {
      await deleteAcademy(academyId);
      return refresh();
    },
    [refresh]
  );

  const createAdmin = useCallback(
    async (academyId, payload) => {
      await addAcademyAdmin(academyId, payload);
      return refresh();
    },
    [refresh]
  );

  const createStaff = useCallback(
    async (academyId, payload, canAddStudents) => {
      await addStaff(academyId, payload, canAddStudents);
      return refresh();
    },
    [refresh]
  );

  const createStudent = useCallback(
    async (academyId, payload) => {
      await addStudent(academyId, payload);
      return refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  return {
    data,
    setData,
    loading,
    error,
    setError,
    refresh,
    create,
    remove,
    createAdmin,
    createStaff,
    createStudent,
  };
}
