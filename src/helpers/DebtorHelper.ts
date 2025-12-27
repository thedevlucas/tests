// Models
import { User } from "../models/User";
import { Debtor } from "../models/Debtor";
import { Cellphone } from "../models/Cellphone";

export async function searchDebtorWithCellphones(
  from_cellphone: number,
  to_cellphone: number
) {
  const cellphone = await Cellphone.findOne({
    where: { from: from_cellphone, to: to_cellphone },
  });

  const debtor = await Debtor.findByPk(cellphone?.id_debtor);

  return debtor;
}

export async function updatePaidStatus(debtor: any, newStatus: string) {
  await debtor.update({ paid: newStatus });
}
