import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export const payrollKeys = {
  timesheets: ['timesheets'],
  clientRates: ['clientRates'],
  employees: ['employees'],
  publicHolidays: ['publicHolidays'],
};

/**
 * Fetch all timesheets (active + archived)
 */
export const useTimesheets = () => {
  return useQuery({
    queryKey: payrollKeys.timesheets,
    queryFn: async () => {
      const res = await api.get('/timesheets');
      return res.data;
    },
    retry: 1,
  });
};

/**
 * Fetch all client rates
 */
export const useClientRates = () => {
  return useQuery({
    queryKey: payrollKeys.clientRates,
    queryFn: async () => {
      const res = await api.get('/clientrates');
      return res.data;
    },
    retry: 1,
  });
};

/**
 * Fetch all employees
 */
export const useEmployees = () => {
  return useQuery({
    queryKey: payrollKeys.employees,
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data;
    },
    retry: 1,
  });
};

/**
 * Fetch all public holidays
 */
export const usePublicHolidays = () => {
  return useQuery({
    queryKey: payrollKeys.publicHolidays,
    queryFn: async () => {
      const res = await api.get('/publicHolidays');
      return res.data;
    },
    retry: 1,
  });
};

/**
 * Combined payroll data query used by Dashboard and CostingSchedule
 */
export const usePayrollData = () => {
  const timesheets = useTimesheets();
  const clientRates = useClientRates();
  const employees = useEmployees();
  const publicHolidays = usePublicHolidays();

  const data = useMemo(
    () => ({
      timesheets: timesheets.data || [],
      clientRates: clientRates.data || [],
      employees: employees.data || [],
      publicHolidays: publicHolidays.data || [],
    }),
    [timesheets.data, clientRates.data, employees.data, publicHolidays.data],
  );

  return {
    data,
    isLoading:
      timesheets.isLoading ||
      clientRates.isLoading ||
      employees.isLoading ||
      publicHolidays.isLoading,
    error:
      timesheets.error ||
      clientRates.error ||
      employees.error ||
      publicHolidays.error,
  };
};

/**
 * Create a single timesheet
 */
export const useCreateTimesheet = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/timesheets', payload);
      return res.data;
    },
  });
};

/**
 * Update a single timesheet
 */
export const useUpdateTimesheet = () => {
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/timesheets/${id}`, payload);
      return res.data;
    },
  });
};

/**
 * Delete a single timesheet
 */
export const useDeleteTimesheet = () => {
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/timesheets/${id}`);
      return id;
    },
  });
};

/**
 * Bulk delete timesheets
 */
export const useBulkDeleteTimesheets = () => {
  return useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => api.delete(`/timesheets/${id}`)));
      return ids;
    },
  });
};

/**
 * Archive timesheets (set status to archived)
 */
export const useArchiveTimesheets = () => {
  return useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => api.put(`/timesheets/${id}`, { status: 'archived' })));
      return ids;
    },
  });
};

/**
 * Create an employee
 */
export const useCreateEmployee = () => {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/employees', payload);
      return res.data;
    },
  });
};

/**
 * Update an employee
 */
export const useUpdateEmployee = () => {
  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const res = await api.put(`/employees/${id}`, payload);
      return res.data;
    },
  });
};

/**
 * Delete an employee
 */
export const useDeleteEmployee = () => {
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/employees/${id}`);
      return id;
    },
  });
};

/**
 * Bulk delete employees
 */
export const useBulkDeleteEmployees = () => {
  return useMutation({
    mutationFn: async (ids) => {
      await Promise.all(ids.map((id) => api.delete(`/employees/${id}`)));
      return ids;
    },
  });
};

export default {
  payrollKeys,
  useTimesheets,
  useClientRates,
  useEmployees,
  usePublicHolidays,
  usePayrollData,
  useCreateTimesheet,
  useUpdateTimesheet,
  useDeleteTimesheet,
  useBulkDeleteTimesheets,
  useArchiveTimesheets,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useBulkDeleteEmployees,
};
