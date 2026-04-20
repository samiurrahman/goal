'use client';

import { Tab } from '@headlessui/react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import React, { FC, Fragment, useEffect, useState } from 'react';
import visaPng from '@/images/vis.png';
import mastercardPng from '@/images/mastercard.svg';
import Input from '@/shared/Input';
import Label from '@/components/Label';
import Textarea from '@/shared/Textarea';
import ButtonPrimary from '@/shared/ButtonPrimary';
import StartRating from '@/components/StartRating';
import NcModal from '@/shared/NcModal';
import ModalSelectDate from '@/components/ModalSelectDate';
import converSelectedDateToString from '@/utils/converSelectedDateToString';
import ModalSelectGuests from '@/components/ModalSelectGuests';
import Image from 'next/image';
import { GuestsObject } from '../(client-components)/type';
import { useSearchParams } from 'next/navigation';

export interface CheckOutPagePageMainProps {
  className?: string;
}

const CheckOutPagePageMain: FC<CheckOutPagePageMainProps> = ({ className = '' }) => {
  const searchParams = useSearchParams();
  const guestsFromUrl = Number(searchParams.get('guests'));

  const initialAdults = Number.isFinite(guestsFromUrl) && guestsFromUrl > 0 ? guestsFromUrl : 2;

  const [startDate, setStartDate] = useState<Date | null>(new Date('2023/02/06'));
  const [endDate, setEndDate] = useState<Date | null>(new Date('2023/02/23'));

  const [guests, setGuests] = useState<GuestsObject>({
    guestAdults: initialAdults,
    guestChildren: 0,
    guestInfants: 0,
  });

  type GuestForm = {
    title: 'Mr' | 'Mrs' | 'Ms';
    name: string;
    email: string;
    mobile: string;
  };

  const createEmptyGuestForm = (): GuestForm => ({
    title: 'Mr',
    name: '',
    email: '',
    mobile: '',
  });

  const [guestForms, setGuestForms] = useState<GuestForm[]>(() =>
    Array.from(
      { length: Math.max(1, initialAdults) },
      () => createEmptyGuestForm()
    )
  );

  const totalGuests = (guests.guestAdults || 0) + (guests.guestChildren || 0);

  // Keep forms aligned with guest count by adding missing forms while preserving entered values.
  useEffect(() => {
    const requiredCount = Math.max(1, totalGuests);
    setGuestForms((prev) => {
      if (prev.length >= requiredCount) return prev;
      return [
        ...prev,
        ...Array.from({ length: requiredCount - prev.length }, () => createEmptyGuestForm()),
      ];
    });
  }, [totalGuests]);

  const handleGuestFormChange = (
    index: number,
    field: keyof GuestForm,
    value: string
  ) => {
    setGuestForms((prev) =>
      prev.map((form, i) => (i === index ? { ...form, [field]: value } : form))
    );
  };

  const handleAddGuestForm = () => {
    setGuestForms((prev) => [...prev, createEmptyGuestForm()]);
  };

  const handleDeleteGuestForm = (index: number) => {
    setGuestForms((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const renderSidebar = () => {
    return (
      <div className="w-full flex flex-col sm:rounded-2xl lg:border border-neutral-200 dark:border-neutral-700 space-y-6 sm:space-y-8 px-0 sm:p-6 xl:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex-shrink-0 w-full sm:w-40">
            <div className=" aspect-w-4 aspect-h-3 sm:aspect-h-4 rounded-2xl overflow-hidden">
              <Image
                alt=""
                fill
                sizes="200px"
                src="https://images.pexels.com/photos/6373478/pexels-photo-6373478.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
              />
            </div>
          </div>
          <div className="py-5 sm:px-5 space-y-3">
            <div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                Hotel room in Tokyo, Jappan
              </span>
              <span className="text-base font-medium mt-1 block">The Lounge & Bar</span>
            </div>
            <span className="block  text-sm text-neutral-500 dark:text-neutral-400">
              2 beds · 2 baths
            </span>
            <div className="w-10 border-b border-neutral-200  dark:border-neutral-700"></div>
            <StartRating />
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <h3 className="text-2xl font-semibold">Price detail</h3>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>$19 x 3 day</span>
            <span>$57</span>
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>Service charge</span>
            <span>$0</span>
          </div>

          <div className="border-b border-neutral-200 dark:border-neutral-700"></div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>$57</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMain = () => {
    return (
      <div className="w-full flex flex-col sm:rounded-2xl sm:border border-neutral-200 dark:border-neutral-700 space-y-8 px-0 sm:p-6 xl:p-8">
        <h2 className="text-3xl lg:text-4xl font-semibold">Confirm and payment</h2>
        <div className="border-b border-neutral-200 dark:border-neutral-700"></div>
        <div>
          <div>
            <h3 className="text-2xl font-semibold">Your trip</h3>
            <NcModal
              renderTrigger={(openModal) => (
                <span
                  onClick={() => openModal()}
                  className="block lg:hidden underline  mt-1 cursor-pointer"
                >
                  View booking details
                </span>
              )}
              renderContent={renderSidebar}
              modalTitle="Booking details"
            />
          </div>
          <div className="mt-6 border border-neutral-200 dark:border-neutral-700 rounded-3xl flex flex-col sm:flex-row divide-y sm:divide-x sm:divide-y-0 divide-neutral-200 dark:divide-neutral-700 overflow-hidden z-10">
            <ModalSelectDate
              renderChildren={({ openModal }) => (
                <button
                  onClick={openModal}
                  className="text-left flex-1 p-5 flex justify-between space-x-5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  type="button"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">Date</span>
                    <span className="mt-1.5 text-lg font-semibold">
                      {converSelectedDateToString([startDate, endDate])}
                    </span>
                  </div>
                  <PencilSquareIcon className="w-6 h-6 text-neutral-6000 dark:text-neutral-400" />
                </button>
              )}
            />

            <ModalSelectGuests
              renderChildren={({ openModal }) => (
                <button
                  type="button"
                  onClick={openModal}
                  className="text-left flex-1 p-5 flex justify-between space-x-5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">Guests</span>
                    <span className="mt-1.5 text-lg font-semibold">
                      <span className="line-clamp-1">
                        {`${
                          (guests.guestAdults || 0) + (guests.guestChildren || 0)
                        } Guests, ${guests.guestInfants || 0} Infants`}
                      </span>
                    </span>
                  </div>
                  <PencilSquareIcon className="w-6 h-6 text-neutral-6000 dark:text-neutral-400" />
                </button>
              )}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold">Guest Details</h3>
            <button
              type="button"
              onClick={handleAddGuestForm}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Add Guest
            </button>
          </div>
          <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

          <div className="space-y-5">
            {guestForms.map((form, index) => (
              <div
                key={`guest-form-${index}`}
                className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 sm:p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-lg font-semibold">Guest {index + 1}</h4>
                  {guestForms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteGuestForm(index)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[20%_80%] gap-4">
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <select
                      value={form.title}
                      onChange={(e) => handleGuestFormChange(index, 'title', e.target.value)}
                      className="block w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      type="text"
                      value={form.name}
                      onChange={(e) => handleGuestFormChange(index, 'name', e.currentTarget.value)}
                      placeholder="Enter full name"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleGuestFormChange(index, 'email', e.currentTarget.value)}
                    placeholder="example@gmail.com"
                  />
                </div>

                <div className="space-y-1">
                  <Label>Mobile no</Label>
                  <Input
                    type="tel"
                    value={form.mobile}
                    onChange={(e) => handleGuestFormChange(index, 'mobile', e.currentTarget.value)}
                    placeholder="Enter mobile number"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label>Messager for author </Label>
          <Textarea placeholder="..." />
          <span className="text-sm text-neutral-500 block">
            Write a few sentences about yourself.
          </span>
        </div>
        <div className="pt-8">
          <ButtonPrimary href={'/pay-done'}>Confirm and pay</ButtonPrimary>
        </div>
      </div>
    );
  };

  return (
    <div className={`nc-CheckOutPagePageMain ${className}`}>
      <main className="container mt-11 mb-24 lg:mb-32 flex flex-col-reverse lg:flex-row">
        <div className="w-full lg:w-3/5 xl:w-2/3 lg:pr-10 ">{renderMain()}</div>
        <div className="hidden lg:block flex-grow">{renderSidebar()}</div>
      </main>
    </div>
  );
};

export default CheckOutPagePageMain;
