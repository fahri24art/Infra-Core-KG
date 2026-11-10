import { addMonths, isSaturday, isSunday, nextSaturday, startOfDay } from 'date-fns';

/**
 * Calculates the next maintenance date based on the last maintenance date.
 * Rule: 6 months interval, adjusted to the nearest upcoming Saturday if the calculated date is not a holiday/weekend preference.
 * Requirement: "di jadwalkan hari sabtu atau tanggal libur"
 */
export const calculateNextMaintenance = (lastDate) => {
    let targetDate = addMonths(startOfDay(new Date(lastDate)), 6);

    // If not Saturday or Sunday, move to next Saturday
    // User specifically asked for "Saturday or holiday". 
    // Simplest logic: always target the next available Saturday if not already on a weekend.
    if (!isSaturday(targetDate) && !isSunday(targetDate)) {
        targetDate = nextSaturday(targetDate);
    }

    return targetDate;
};

export const formatDate = (date) => {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};
